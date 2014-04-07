/**
 * Created by Evgeniy on 20.03.14.
 */

var RabbitMQ = require("../lib/rabbit").createConnect("amqp://"+process.env.HOST || "localhost").RabbitMQ
    , should = require("should");

describe("RabbitMQ", function(){


    var Queue = new RabbitMQ("test.queue");

    it("#publish", function(done){

        Queue.subscribe(function(messasge){
            messasge.message.should.be.eql({test: "test"});
            Queue.unsubscribe();
            done();
        }, function(){
            Queue.publish({test: "test"});
        });

    });

    it("#publish and Reply", function(done){

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

    });

    it("#publish and ack", function(done){

        Queue.subscribe(function(message){
           message.acked();
           Queue.unsubscribe();
           done();
        }, function(){
            Queue.publish({test: "ack"});
        }, true);

    });


});
