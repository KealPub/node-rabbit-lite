/**
 * Created by Evgeniy on 20.03.14.
 */

var should = require("should")
    , rabbit = require("../lib/rabbit")
    , _ = require("underscore");

var testCase = {

    publish: function(Queue){
       return function(done){

           Queue.subscribe(function(messasge){
               messasge.message.should.be.eql({test: "test"});
               Queue.unsubscribe();
               done();
           }, function(){
               Queue.publish({test: "test"});
           });

       }
    },

    publishAndReply: function(Queue){
        return function(done){

            Queue.subscribe(function(message){
                if(message.message.test == "reply"){
                    message.reply({test: "test"});
                }else if(message.message.test == "test"){
                    Queue.unsubscribe();
                    done();
                }
            }, function(){
                Queue.publish({test: "reply"}, {replyTo: "test.queue"});
            });

        }
    },

    publishAndAck: function(Queue){

        return function(done){

            Queue.subscribe(function(message){
                message.acked();
                Queue.unsubscribe();
                done();
            }, function(){
                Queue.publish({test: "ack"});
            }, true);

        }

    }

}


describe("Before connection", function(){
    var rb = rabbit.createConnect("amqp://"+process.env.HOST || "localhost");
    var Queue = new rb.RabbitMQ("test.queue");

    it("#publish", testCase["publish"](Queue));

    it("#publish and Reply", testCase["publishAndReply"](Queue));

    it("#publish and ack", testCase["publishAndAck"](Queue));

    after(function(done){
          rabbit.closeConnect(function(){
              done();
          });
    });


});

describe("After connection", function(){
    var Queue = {};

    before(function(done){
         rabbit.createConnect("amqp://"+process.env.HOST || "localhost", function(err){
             if(err) return done(err);

             _.extend(Queue, new rabbit.RabbitMQ("test.queue"));
             done();
         });
    });

    it("#publish", testCase["publish"](Queue));

    it("#publish and Reply", testCase["publishAndReply"](Queue));

    it("#publish and ack", testCase["publishAndAck"](Queue));

});
