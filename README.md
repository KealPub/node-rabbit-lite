# Node Rabbit

Модуль для легкой и удобной работы с RabbitMQ

### Install

`npm install git+ssh://git@git.fbs-d.com:e.ivanov/node-rabbit.git`

### Example

```javascript
    var RabbitMQ = require("rabbitmq").createConnect("amqp://rabbit-mq-host").RabbitMQ;

    var testQueue = new RabbitMQ("test.queue");

    testQueue.subscribe(function(message){
        console.log(message);
    }, function(){
        testQueue.publish({test: "test"});
    });

```
