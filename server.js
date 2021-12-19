var express = require("express");
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cors = require("cors");
var morgan = require("morgan");
var jwt = require('jsonwebtoken');// https://github.com/auth0/node-jsonwebtoken //is JWT secure? https://stackoverflow.com/questions/27301557/if-you-can-decode-jwt-how-are-they-secure
var path = require("path")
var authRoutes = require("./auth");
var { ServerSecretKey, PORT } = require("./core/index")
var socketIo = require("socket.io");
var http = require("http");
var { getUser, tweet, profilepic } = require("./dberor/models")


// =========================>


let appxml = express()
var server = http.createServer(appxml);
var io = socketIo(server, { cors: { origin: "*", methods: "*", } });

appxml.use(bodyParser.json());
appxml.use(cookieParser());
appxml.use(cors({
    origin: ["http://localhost:3000", 'https://boilerplates-login-sign-mern.herokuapp.com'],
    credentials: true
}));

appxml.use(morgan('dev'));
const fs = require('fs')
const multer = require("multer");


//==============================================
const storage = multer.diskStorage({
    // https://www.npmjs.com/package/multer#diskstorage
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, `${new Date().getTime()}-${file.filename}.${file.mimetype.split("/")[1]}`)
    }
})
//==============================================
var upload = multer({ storage: storage })

// =========================>
appxml.use("/", express.static(path.resolve(path.join(__dirname, "reactNative/androide"))));
// =========================>

appxml.use("/auth", authRoutes)


appxml.use(function (req, res, next) {

    console.log("req.cookies: ", req.cookies);
    if (!req.cookies.jToken) {
        res.status(401).send("include http-only credentials with every request")
        return;
    }
    jwt.verify(req.cookies.jToken, ServerSecretKey, function (err, decodedData) {
        if (!err) {

            const issueDate = decodedData.iat * 1000;
            // javascript ms 13 digits me js me, mger iat deta hai 16 digit ka
            const nowDate = new Date().getTime();
            const diff = nowDate - issueDate;
            // 86400,000

            if (diff > 300000) {
                // expire after 5 min (in milis)
                res.status(401).send("token expired")
            } else {
                // issue new token
                var token = jwt.sign({
                    id: decodedData.id,
                    name: decodedData.name,
                    email: decodedData.email,
                    role: decodedData.role,
                }, ServerSecretKey)
                res.cookie('jToken', token, {
                    maxAge: 86_400_000,
                    httpOnly: true
                });
                req.body.jToken = decodedData
                req.headers.jToken = decodedData;
                next();
            }
        } else {
            res.status(401).send("invalid token")
        }
    });
})


// ==========================================>Start Get Profile /////
appxml.get("/getProfile", upload.any(), (req, res, next) => {
    console.log("my tweets user=>", req.body);
    getUser.findById(req.body.jToken.id, 'name email role createdOn', (err, doc) => {
        console.log("ya kia han dekhna han", req.body.jToken.id)
        if (!err) {
            console.log(doc, "FSAfsafas");
            res.send({
                profile: doc
            })
        } else {
            res.status(500).send({
                message: "server error"
            })
        }
    })
});


appxml.post("/profilePOST", upload.any(), (req, res, next) => {
    console.log(req.body.tweet)
    console.log("req body of tweet ", req.body);
    // if (!req.body.formData) {
    if (!req.body.tweet) {
        res.status(409).send(`
                Please send useremail and tweet in json body
                e.g:
                "name": "name",
                "email": "abc@gmail.com",
                "text": "abc"
            `)
        return;
    };
    getUser.findById(req.body.jToken.id,
        console.log(req.body),
        (err, user) => {
            if (!err) {
                console.log("tweet user : " + user);
                tweet.create({
                    name: user.name,
                    email: user.email,
                    msg: req.body.tweet,
                    profileUrl: user.profileUrl,
                }).then((data) => {
                    console.log("Tweet creaxcvxcvxvted;': " + user),

                        res.status(200).send({
                            msg: req.body.tweet,
                            name: data.name,
                            email: data.email,
                            profileUrl: data.profileUrl,
                        });

                    io.emit("chat-connect", data)
                    // io.emit("chat-img", user)
                }).catch((err) => {
                    res.status(500).send({
                        message: "an error occured : " + err,
                    });
                });
            }
            // else {
            //     console.log("tweet user : " + user);
            //     tweet.create({
            //         name: user.name,
            //         email: user.email,
            //         msg: req.body.tweet,
            //         profileUrl: user.profileUrl,
            //     }).then((data) => {
            //         console.log("Tweet creaxcvxcvxvted;': " + user),

            //             res.status(200).send({
            //                 msg: req.body.tweet,
            //                 name: data.name,
            //                 email: data.email,
            //                 profileUrl: data.profileUrl,
            //             });

            //         io.emit("chat-connect", data)
            //         // io.emit("chat-img", user)
            //     }).catch((err) => {
            //         res.status(500).send({
            //             message: "an error occured : " + err,
            //         });
            //     });
            //             }
            //         }
            //         )


        }
        // }
    );
})


appxml.get('/realtimechat', upload.any(), (req, res, next) => {

    tweet.find({}, (err, data) => {
        if (!err) {
            console.log("tweetdata=====>", data);
            res.send({
                tweet: data,
                // profileUrl: urlData[0],
            });
        }
        else {
            console.log("error : ", err);
            res.status(500).send("error");
        }
    })
});


appxml.post("/upload", upload.any(), (req, res, next) => {
    // never use upload.single. see https://github.com/expressjs/multer/issues/799#issuecomment-586526877

    bucket.upload(
        req.files[0].path,
        function (err, file, apiResponse) {
            if (!err) {
                file.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                }).then((urlData, err) => {
                    if (!err) {
                        getUser.findById(req.headers.jToken.id, (err, userData) => {
                            userData.update({ profileUrl: urlData[0] }, (err, updated) => {
                                if (!err) {
                                    res.status(200).send({
                                        profileUrl: urlData[0],
                                    })
                                }
                            })
                        })
                    }
                })
            } else {
                console.log("err: ", err)
                res.status(500).send();
            }
        });
})


server.listen(PORT, () => {
    console.log("chal gya hai server", PORT)
})


// ==========================================>Server /////



// ==========================================>Server End/////