const Koa = require('koa'); // core
const Router = require('koa-router'); // routing
const bodyParser = require('koa-bodyparser'); // POST parser
const serve = require('koa-static'); // serves static files like index.html
const logger = require('koa-logger'); // optional module for logging

const passport = require('koa-passport'); //passport for Koa
const LocalStrategy = require('passport-local'); //local Auth Strategy
const JwtStrategy = require('passport-jwt').Strategy; // Auth via JWT
const ExtractJwt = require('passport-jwt').ExtractJwt; // Auth via JWT

const jwtsecret = "mysecretkey"; // signing key for JWT
const jwt = require('jsonwebtoken'); // auth via JWT for hhtp
const socketioJwt = require('socketio-jwt'); // auth via JWT for socket.io

const socketIO = require('socket.io');

const mongoose = require('./libs/mongoose');


const app = new Koa();
const router = new Router();
app.use(serve('public'));
app.use(logger());
app.use(bodyParser());



app.use(async (ctx, next) => {
  const origin = ctx.get('Origin');
	console.log(ctx.method)
  if (ctx.method !== 'OPTIONS') {
    ctx.set('Access-Control-Allow-Origin', origin);
    ctx.set('Access-Control-Allow-Credentials', 'true');
  } else if (ctx.get('Access-Control-Request-Method')) {
    ctx.set('Access-Control-Allow-Origin', origin);
    ctx.set('Access-Control-Allow-Methods', ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS']);
    ctx.set('Access-Control-Allow-Headers', ['Content-Type', 'Authorization', 'Access-Control-Allow-Headers', 'headers']);
    ctx.set('Access-Control-Max-Age', '42');
    ctx.set('Access-Control-Allow-Credentials', 'true');
    ctx.response.status = 200
    console.log('ctx.response.status', ctx.response.status)	
  }
  await next();
});





app.use(passport.initialize()); // initialize passport first
app.use(router.routes()); // then routes
const server = app.listen(process.env.PORT || 4000);// launch server on port  4000


//---------Use Schema and Module  ------------------//

const User = require('./libs/user')

//----------Passport Local Strategy--------------//

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: false
  },
  function (email, password, done) {
    User.findOne({email}, (err, user) => {
      if (err) {
        return done(err);
      }

      if (!user || !user.checkPassword(password)) {
        return done(null, false, {message: 'User does not exist or wrong password.'});
      }
      return done(null, user);
    });
  }
  )
);

//----------Passport JWT Strategy--------//

// Expect JWT in the http header

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: jwtsecret
};

passport.use(new JwtStrategy(jwtOptions, function (payload, done) {
    User.findById(payload.id, (err, user) => {
      if (err) {
        return done(err)
      }
      if (user) {
        done(null, user)
      } else {
        done(null, false)
      }
    })
  })
);

//------------Routing---------------//

// new user route





router.post('/user', async(ctx, next) => {
  try {

//    ctx.body = await User.create(ctx.request.body);

    console.log("post, ctx.request.body : ", ctx.request.body)
    //let user = await User.create(pick(ctx.request.body, User.publicFields));
    let user = await User.create(ctx.request.body)
    ctx.body = user.toObject();


  }
  catch (err) {
    ctx.status = 400;
    ctx.body = err;
  }
});

// local auth route. Creates JWT is successful

router.post('/login', async(ctx, next) => {
  await passport.authenticate('local', function (err, user) {
    console.log("user : ", user)
    if (user == false) {
      ctx.body = "Login failed";
    } else {
      //--payload - info to put in the JWT
      const payload = {
        id: user.id,
        displayName: user.displayName,
        email: user.email
      };
      const token = jwt.sign(payload, jwtsecret); //JWT is created here

      ctx.body = {user: user.displayName, token: 'JWT ' + token};
    }
  })(ctx, next);

});

// JWT auth route

router.get('/custom', async(ctx, next) => {

  await passport.authenticate('jwt', function (err, user) {
    if (user) {
      ctx.body = "hello " + user.displayName;
    } else {
      ctx.body = "No such user";
      console.log("err", err)
    }
  } )(ctx, next)

});

//---Socket Communication-----//
let io = socketIO(server);

io.on('connection', socketioJwt.authorize({
  secret: jwtsecret,
  timeout: 15000
})).on('authenticated', function (socket) {

  console.log('this is the name from the JWT: ' + socket.decoded_token.displayName);

  socket.on("clientEvent", (data) => {
    console.log(data);
  })
});
