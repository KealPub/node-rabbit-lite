/**
 * Created by Evgeniy on 19.03.14.
 */

var amqp = require("amqplib")
    , EventEmitter = require("events").EventEmitter
    , Events = require("./ObjectEvents")
    , _ = require("underscore");





var _connect,
    connected = false;

var createConnect = function(options, callback){
    var open = amqp.connect(options);
    open.then(function(connect){

        _connect = connect;
        connected = true;
        objectEvents.emit("ready");
        callback();
    }).then(null, function(err){
            callback(err);
            connected = false;
            throw err;

    });

    return exports;
}






var objectEvents = new Events();


var default_option = {
    durable: true
}



/**
 * Объект очереди
 * @param queue
 * @param options
 * @param connect
 * @constructor
 */
var RabbitMQ = function(queue, options, connect){
    this.queue = queue;
    this.options = options ? _.defaults(options, default_option) : default_option;
    this.cache = [];

    this.on("ready", this.executeCache);

    this.createChannel();

    EventEmitter.call(this);
    objectEvents.set(this.queue, this);
}

RabbitMQ.prototype.createChannel = function(){
    if(!this.connected(true)){
        this.cache.push({
            fn: this.createChannel,
            arguments: arguments
        });

        return;
    }
    var _then = this;

    _connect.createChannel().then(function(ch){
        _then.connect = ch;
        _then.emit("ready");
    });
}

RabbitMQ.prototype.subscribe = function(callback, subscribe_callback, needAck){

    if(!this.connected()){
        this.cache.push({
            fn: this.subscribe,
            arguments: arguments
        });

        return;
    }

    if(!_.isFunction(subscribe_callback)){
        if(_.isBoolean(subscribe_callback)){
            needAck = subscribe_callback;
        }

        subscribe_callback = function(){};
    }



    var _then = this;

    var ok = this.connect.assertQueue(this.queue, this.options);

    this.connect.consume(this.queue, function(message){
        var mes = new Message(message, _then.connect, needAck);
        callback(mes);
    }, {noAck: !needAck}).then(function(tag){
        _then.ctag = tag.consumerTag;

        ok.then(function(){
            subscribe_callback();
        })
    });

}

RabbitMQ.prototype.unsubscribe = function(){
    if(!this.connected()){
        this.cache.push({
            fn: this.unsubscribe,
            arguments: arguments
        });

        return;
    }

    if(!this.ctag) return;

    this.connect.cancel(this.ctag);
    delete this.ctag;
}

RabbitMQ.prototype.connected = function(mainConnect){
    if(mainConnect) return connected;
    return connected && this.connect;
};

RabbitMQ.prototype.publish = function(message, options){
    if(!this.connected()){
        this.cache.push({
            fn: this.publish,
            arguments: arguments
        });

        return;
    }
    this.connect.sendToQueue(this.queue, toBuffer(message), options);
}

RabbitMQ.prototype.executeCache = function(){
    var _then = this;
    this.cache.forEach(function(item, key){
        item.fn.apply(_then, Array.prototype.slice.call(item.arguments))
        delete _then.cache[key];
    });
}

RabbitMQ.prototype.destruct = function(){
    objectEvents.delete(this.queue);
}



RabbitMQ.prototype.__proto__ = EventEmitter.prototype;


/**
 * Объект сообщения
 * @param message
 * @param headers
 * @param deliveryInfo
 * @param ack
 * @constructor
 */
var Message = function(message, connect, needAck){
    this.cache = [];

    this.connect = connect || this.createChannel();

    this._message = message;

    this.message = parseMessage(message.content, "JSON");
    this.headers = message.properties.headers;
    this.deliveryInfo = message.fields;
    this.properties = message.properties;


    this.needAck = needAck;
}

Message.prototype.createChannel = RabbitMQ.prototype.createChannel;
Message.prototype.connected = RabbitMQ.prototype.connected;
Message.prototype.executeCache = RabbitMQ.prototype.executeCache;

Message.prototype.reply = function(message){
    this.acked();
    if(this.properties.replyTo) this.connect.sendToQueue(this.properties.replyTo, toBuffer(message));
    return this;
}

Message.prototype.acked = function(){
    if(this.needAck) this.connect.ack(this._message);
    return this;
};

var parseMessage = function(buf, contentType){
    return JSON.parse(buf.toString());

}

var toBuffer = function(message){
    if(_.isObject(message) || _.isArray(message)){
        message = JSON.stringify(message);
    }

    return new Buffer(message);
}

exports.RabbitMQ = RabbitMQ;
exports.Message = Message;
exports.createConnect = createConnect;



