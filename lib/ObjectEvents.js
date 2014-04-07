/**
 * Created by Evgeniy on 19.03.14.
 */
var _ = require("underscore");


var Events = function(){
    this.objects = {};
}

Events.prototype.set = function(key, obj){
    this.objects[key] = obj;
}

Events.prototype.delete = function(key){
    delete this.objects[key];
}

Events.prototype.emit = function(event){
    _.each(this.objects,function(item){
        item.emit(event);
    })
}

module.exports = Events;
