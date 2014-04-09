# Node Rabbit

Модуль для легкой и удобной работы с RabbitMQ
Базируется на модуле https://github.com/squaremo/amqp.node

На данный момент работа ведется только с дефолтной ('') точкой обмена

### Install

`npm install git+ssh://git@github.com:KealPub/node-rabbit-lite.git`

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

# API

### createConnect(host)
Создает подключение до Rabbit. Используется метод `connect` из amqp.node
Подробнее: http://squaremo.github.io/amqp.node/doc/channel_api.html#toc_1

## RabbitMQ

### new RabbitMQ(name, [options], [connect])
Создание обработчика очереди. `name` строка имени очереди с которой будет происходить работа.

`options` объект опций очереди, применятеся для `assertQueue`, подробней можно прочитать тут: http://squaremo.github.io/amqp.node/doc/channel_api.html#toc_16

По умолчанию выставленно `durable: true` `autoDelete: true`.

`connect` кастомный объект канала: http://squaremo.github.io/amqp.node/doc/channel_api.html#toc_10

По умолчанию используется общий для всех

### RabbitMQ#subscribe(messageHandler, [callback], [needAck])
Подписка на очередь.

`messageHandler` является функцией, которая принимает аргумент `message`. `message` - Объект `new Message()`. Отрабатывает при поступлении нового сообщения в очередь.

`callback` - функция, которая отрабатывает при успешной подписки на очередь.

`needAck` - Boolean, указывает на то, нужно ли очереди дожидаться подтверждения принятия сообщения.

### RabbitMQ#unsubscribe()
Отписывается от текущей очереди

### RabbitMQ#publish(message, [options])
Публикует сообщение в очередь.
Использует метод `sendToQueue` библиотеки amqp.node

`message` - сообщение для публикации, может быть как объектом (автоматически сконвертится в JSON), так и любым другим типом, с которым работает `Buffer`

`options` - объект опций при публикации, передается в `sendToQueue`, подробнее http://squaremo.github.io/amqp.node/doc/channel_api.html#toc_27

### RabbitMQ#getConnect()
Возвращает объект канала

### RabbitMQ#connected()
Возвращает открыто ли подключение до Rabbit. true или false.

## Message

### new Message(message, [connect], [needAck])
Создание объекта сообщения.
`message` - Объект сообщения из библиотеки amqp.node  (http://squaremo.github.io/amqp.node/doc/channel_api.html#toc_29)

`connect` - Объект кастомного канала (то же что и в RabbitMQ)

`needAck` - Boolean, следует ли подтвержать получение этого сообщения

### Message.message
Тело сообщения

### Message.properties
Дополнительные заголовки сообщения (см. документацию к протоколу AMQP)

### Message#acked()
Подтверждение получения сообщения

### Message#reply(message)
Ответ на сообщение, если в заголовке сообщения указан параметр `replyTo` (см. документацию к `RabbitMQ#publish()`). Если необходимо, автоматически подтверждает прием сообщения (`ack`)

### Event "reply"
Срабатывет при ответе на сообщение.

__Example__:
```javascript
    //...
    message.on("reply", function(){
        console.log("Reply!")
    });

    message.reply("I'am reply");
```

TODO:
* Реализовать методы управления очередью, такие как удаление, изменение параметров и т.д.
* Сделать возможность мульти канального подключения
* Сделать работу с разными точками обмена