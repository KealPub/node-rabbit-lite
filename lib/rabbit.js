/**
 * Created by Evgeniy on 02.02.15.
 */
var amqp = require("amqplib"),
    Q = require("q"),
    _ = require("underscore");

var connectPromise = Q.defer();

var _channel = connectPromise.promise,
    _connect,
    connected = false;

var createConnect = function(options){
    var open = amqp.connect(options);
    return Q.fcall(function(){
        return open.then(function(connect){
            _connect = connect;
            return connect.createChannel().then(function(ch){
                connected = true;
                connectPromise.resolve(ch);
            });
        })
            .then(null, function(err){
                connected = false;
                connectPromise.reject(err);
                throw err;
            });
    });

};

var default_queue_option = {
    durable: false,
    autoDelete: true
};

var RabbitMQ = function(exhanger, queue, queue_options, exchanger_options){
    this.exchanger = exhanger;
    this.queue = queue;
    this.queue_options = queue_options ? _.defaults(queue_options, default_queue_option) : default_queue_option;
    this.exchanger_options = exchanger_options || {};

    if(!_.isUndefined(this.queue_options.assert)){
        this.queue_assert = this.queue_options.assert;
        delete this.queue_options.assert;
    }

    if(!_.isUndefined(this.queue_options.bind)){
        this.bind_queue = this.queue_options.bind;
        delete this.queue_options.bind;
    }

    if(!_.isUndefined(this.exchanger_options.type)){
        this.exchanger_type = this.exchanger_options.type;
        delete this.exchanger_options.type;
    }

    this.assert = this.assertQueue();
};

RabbitMQ.prototype.subscribe = function(callback, needAck, prefecth){
    var def = Q.defer();
    var _then = this;
    return this.assert.then(function(){
        return  _then.getConnect();
    })
        .then(function(ch) {
            if(prefecth && _.isNumber(prefecth)){
                ch.prefetch(prefecth);
            }
            return ch.consume(
                _then.queue,
                function (message) {
                    var mes = new Message(message, needAck, _then.exchanger);
                    callback(mes);
                },
                {noAck: !needAck}
            ).then(function (tag) {
                    _then.ctag = tag.consumerTag;

                    _then.assert.then(def.resolve)
                        .catch(def.reject);
                })
                .then(null, def.reject);
        }).then(null, def.reject);

    return def.promise;
};

RabbitMQ.prototype.publish = function(message, options){
    var _then = this;
    return this.getConnect().then(function(ch){
        if(!ch.publish(_then.exchanger, _then.queue, toBuffer(message), _.defaults(options || {}, default_queue_option))){
            throw Error("Publish Error");
        }

        return;
    });
};

RabbitMQ.prototype.unsubscribe = function(){
    var def = Q.defer(),
        _then = this;

    if(!this.ctag) {
        def.resolve();
        return def.promise;
    }

    this.getConnect().then(function(ch){
        return ch.cancel(_then.ctag);
    })
        .then(function(){
            delete _then.ctag;
            def.resolve();
        })
        .then(null, function(err){
            def.reject(err);
        });

    return def.promise;
}

RabbitMQ.prototype.getConnect = function(){
    return _channel;
};

RabbitMQ.prototype.activeConnect = function(){
    return connected;
};

RabbitMQ.prototype.assertQueue = function(){
    var _then = this;
    var channel;

    var assertQueue = function(channel){
        if(_then.queue_assert !== false){
            return channel.assertQueue(_then.queue, _then.queue_options)
                .then(function(){
                    if(_then.bind_queue === true){
                        return channel.bindQueue(_then.queue, _then.exchanger, _then.queue);
                    }

                    return;
                });
        }

        return;
    }

    if(this.exchanger && this.exchanger !== ''){
        return this.getConnect().then(function(ch){
            channel = ch;
            return ch.assertExchange(_then.exchanger, _then.exchanger_type || "fanout", _then.exchanger_options);
        })
            .then(function(){
                return assertQueue(channel);
            });
    }else{
        return _then.getConnect().then(function(ch){
            return assertQueue(ch);
        });
    }

};


var Message = function(message, needAck, exchanger){

    this._message = message;

    this.message = parseMessage(message.content, "JSON");
    this.headers = message.properties.headers;
    this.deliveryInfo = message.fields;
    this.properties = message.properties;
    this.exchanger = exchanger;

    this.needAck = needAck;

};

Message.prototype.reply = function(message){
    var _then = this;
    return this.ack()
        .then(function(){
            if(_then.properties.replyTo) {
                return _then.getConnect().then(function(ch){
                    return ch.publish(_then.exchanger, _then.properties.replyTo, toBuffer(message));
                });
            }

            return true;
        });
};

Message.prototype.ack = function(){
    var _then = this;
    return this.getConnect()
        .then(function(ch){
            if(_then.needAck) {
                return ch.ack(_then._message);
            }
            return;
        })

};

Message.prototype.getConnect = RabbitMQ.prototype.getConnect;


var closeConnect = function(){
    var def = Q.defer();
    _channel.then(function(ch){
        ch.close();
        ch.on("close", def.resolve);
        connectPromise = Q.defer();

    });
    connected = false;
    return def.promise;
};

var toBuffer = function(message){
    if(_.isObject(message) || _.isArray(message)){
        message = JSON.stringify(message);
    }

    return new Buffer(message);
}

var parseMessage = function(buf){
    try{
        return JSON.parse(buf.toString());
    }catch(e){
        return buf.toString();
    }
}


exports.RabbitMQ = RabbitMQ;
exports.Message = Message;
exports.createConnect = createConnect;
exports.closeConnect = closeConnect;
exports.getConnect = function(){
    return _channel;
}
