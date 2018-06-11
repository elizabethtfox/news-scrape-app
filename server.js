//Dependencies
const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
const hbars = require("express-handlebars");
const request = require("request");
const cheerio = require("cheerio");

//Require all models
const db = require("./models");

const PORT = 3000;

//Initialize Express
const app = express();

//Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: false }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost/reddit", {
    useMongoClient: true
});

//Mongoose - success message upon database connection
const mdb = mongoose.connection;
mdb.on('error', console.error.bind(console, 'connection error:'));
mdb.once('open', function() {
    console.log("DB is running on local host")
});

app.set('views', path.join(__dirname, 'views'));
app.engine("handlebars", hbars({defaultLayout: "main"}));
app.set("view engine", "handlebars");

//Routes
//A GET route for scraping the website
app.get("/scrape", function(req, res){
    //First, we grab the body of the HTML with request
    request.get("https://www.reddit.com/", function(error, response, html){
        //Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);
        //Now, we grab every article by class within an article tag, and do the following:
        $(".top-matter").each(function(i, element){
            //Save an empty result object
            var result = {};

            //Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
                .children("a")
                .text();
            result.link = $(this)
                .children("a")
                .attr("href");
            result.summary = $(this)
                .children("p")
                .text();

            //Create a new Article using the "result" object built from scraping
            db.Article
                .create(result)
                .then(function(dbArticle){
                    //If we were able to successfully scrape and save an Article, send a message to the client
                    res.send("Scrape Complete");
                    console.log(dbArticle);
                })
                .catch(function(err){
                    //If an error occured, send it to the client
                    res.json(err);
                });
        });
    });
});

//Route to grab articles from the database
app.get("/articles", function(req, res){
    db.Article.find({})
        .then(function(dbArticle){
            res.json(dbArticle);
        })
        .catch(function(err){
            res.json(err);
        });
});

//Route to grab an article by ID and it's note
app.get("article/:id", function(req, res){
    db.Article.findOne({_id: req.params.id})
        .populate("note")
        .then(function(dbArticle){
            res.send(dbArticle);
        })
        .catch(function(err){
            res.json(err);
        });
});

//Route for updating an article's associated note
app.post("/articles/:id", function(req, res){
    db.Note.create(req,body)
        .then(function(dbNote){
            return db.Article.findOneAndUpdate({_id: req.params.id}),
                {note: dbNote._id},
                {new: true};
        })
        .then(function(dbArticle){
            res.join(dbArticle)''
        })
        .catch(function(err){
            res.json(err);
        });
});

//Start the server
app.listen(PORT, function(){
    console.log("App running on PORT: " + PORT + "!");
});