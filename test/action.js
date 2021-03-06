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
var actions;

describe("eeaction",function(){

    before(function(done){
        db = new arango.Connection("http://127.0.0.1:8529");
        db.use(":_routing").simple.removeByExample({"url" : {"match":"/alreadyExistingRoute","methods":["GET"]}}, function(err,ret, message){
            db.use(":_routing").simple.removeByExample({"url" : {"match":"/hello","methods":["GET"]}}, function(err,ret, message){
                // write a new route directly into arango
                var route = {action : {"callback":"function (req,res){\n \n res.statusCode = 200;\n; res.contentType = \"text/html\";\n res.body = \"Already existing route!\";\n }"}}
                route.url = {"match":"/alreadyExistingRoute","methods":["GET"]};
                db.use(":_routing").document.create(route).then(function(res){
                    submit[o.name].route = res._id;
                    /* reload routes */
                    db.admin.routesReload();
                }, function(error){});

                //register an action and create a new route and reload routes
                db.action.define({name:"hello",url:"/hello"},function(req,res){
                    /* Note: this code runs in the ArangoDB */
                    res.statusCode = 200;
                    res.contentType = "text/html";
                    res.body = "Hello World!";
                },true);
                // write a new route directly into arango
                done();
            });
        });
    })

    it('define an action for which no route exists',function(done){

        db.action.define(
            {
                name: 'someAction',
                url: 'http://127.0.0.1:8530/test',
                method: 'post',
                result: function(res){return res; },
                error: function(err){ return err; }
            }
        )
        check( done, function () {
            db.action.getActions().should.have.property('someAction');
        } );
    })


    it('call this action and expect a route not found error',function(done){

        db.action.submit("someAction", function(err,ret){
            check( done, function () {
                ret.code.should.eql(404);
                ret.error.should.eql(true);
            } );
        });

    })

    it('delete this action',function(done){

        db.action.undefine("someAction");
        check( done, function () {
            db.action.getActions().should.not.have.property('someAction');
        } );
    })

    it('define an action for which a route exists',function(done){

        db.action.define(
            {
                name: 'someAction',
                url: 'http://127.0.0.1:8530/alreadyExistingRoute',
                method: 'GET',
                result: function(res){return res;},
                error: function(err){ return err; }
            }
        )
        check( done, function () {
            db.action.getActions().should.have.property('someAction');
        } );

    })

    it('call this action and expect the route to be found',function(done){
        db.action.submit("someAction",  function(err, ret, message){
            check( done, function () {
                ret.should.eql("Already existing route!");
                message.statusCode.should.eql(200);
            } );
        });

    })

    it('call the action defined in setup action and expect the route to be found',function(done){
        db.action.submit("hello", function(err, ret, message){
            check( done, function () {
                ret.should.eql("Hello World!");
                message.statusCode.should.eql(200);
                Object.keys(db.action.getActions()).length.should.eql(2);
                actions = db.action.getActions();
            } );
        });

    })

    it('delete the action "hello".....',function(done){
        db.action.undefine("hello");
        check( done, function () {
            db.action.getActions().should.not.have.property('hello');
            Object.keys(db.action.getActions()).length.should.eql(1);
        } );
    })
    it('...and check that route has been deleted to',function(done){
        db.document.get(actions.hello.route, function(err,ret, message){
            check( done, function () {
                ret.error.should.equal(true);
                message.statusCode.should.equal(404);
            } );
        });
    })


})
