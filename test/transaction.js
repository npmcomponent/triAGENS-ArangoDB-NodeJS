try{ arango = require('arango') } catch (e){ arango = require('..') }

function check( done, f ) {
    try {
        f()
        done()
    } catch( e ) {
        console.log(e);
        done( e )
    }
}

var db;

describe("transaction",function(){


    before(function(done){
        this.timeout(20000);
        db = new arango.Connection("http://127.0.0.1:8529");
        db.database.delete("newDatabase",function(err, ret){
            db.database.create("newDatabase",function(err, ret){
                db = new arango.Connection({_name:"newDatabase",_server:{hostname:"localhost"}});
                db.collection.create("collection", function(err,ret){
                    db.collection.create("collection2", function(err,ret){
                        done();
                    });
                });
            });
        });

    })
 +
    it('submit transaction',function(done){

        var collection = {write : ["collection"]};
        var action = "function (params) { var db = require('internal').db; for (var i in params.param) {db.collection.save({'_key' : params.param[i]});} return db.collection.count(); }";

        var options = {waitForSync : true, lockTimeout : 0 , replicate : false};
        options.params = {param : ["hans", "herbert", "harald"]};

        db.transaction.submit(collection, action, options, function(err,ret, message){
            check( done, function () {
                ret.error.should.equal(false);
                ret.result.should.equal(3);
                message.statusCode.should.equal(200);
            } );
        });
    })

    it('submit transaction with malformed action',function(done){

        var collection = {write : ["collection"]};
        var action = "function (params) { var db = require('internal').db; for(var i in params.param){db.collection.save({'_key' : params.param[i]});} return db.collection.count(); }";

        var options = {waitForSync : true, lockTimeout : 0 , replicate : false};
        options.params = {param : ["hans", "herbert", "harald"]};

        db.transaction.submit(collection, action, options, function(err,ret, message){
            check( done, function () {
                ret.error.should.equal(true);
                message.statusCode.should.equal(400);
            } );
        });
    })

    it('submit transaction with unknown collection',function(done){

        var collection = {write : ["unknown"]};
        var action = "function (params) { var db = require('internal').db; for (var i in params.param) {db.unknown.save({'_key' : params.param[i]});} return db.unknown.count(); }";

        var options = {waitForSync : true, lockTimeout : 0 , replicate : false};
        options.params = {param : ["hans", "herbert", "harald"]};

        db.transaction.submit(collection, action, options, function(err,ret, message){
            check( done, function () {
                ret.error.should.equal(true);
                message.statusCode.should.equal(404);
            } );
        });
    })

})
