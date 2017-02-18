var express = require('express');
var fs = require('fs');
var app = express();
var passport = require('passport');
var FacebookStrategy = require('passport-facebook');
var sha1 = require('sha1');
app.use(require('body-parser').urlencoded({
  extended: true
}));
app.use(require('express-session')({
  secret: 'correct battery house staple',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});
passport.use(new FacebookStrategy({
  clientID: "1615569928454922",
  clientSecret: "63fdba9b3dad66b0fd18b04f13f4eac6",
  callbackURL: "https://fcc-voting-slava.herokuapp.com/auth/facebook/callback"
},
  function (accessToken, refreshToken, profile, done) {
    if (profile) {
      user = profile;
      return done(null, user);
    }
    else {
      return done(null, false);
    }
  }
));
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
    if (!fs.existsSync("polls/" + req.user.id)) {

      fs.mkdir("polls/" + req.user.id)
    }
  });

function vote(username, pollname, option, cb) {
  fs.readFile("users/" + username + ".json", function (err, userData) {
    if (err) {
      userData = `
      {
          "username": "${username}",
          "password": "very (((secret))) password",
          "voted": {}
      }`;
      fs.writeFile("users/" + username + ".json", userData);
    }
    var user = JSON.parse(userData);
    fs.readFile("polls/" + pollname, function (err, pollData) {
      console.log("polls/" + "/" + poll);
      var poll = JSON.parse(pollData);

      if (user.voted[pollname] !== undefined) {
        //User has voted on this poll
        //Reset user impact on poll
        var voted = user.voted[pollname];
        poll.options[voted].votes -= 1;
        user.voted[pollname] = undefined;
      }
      if (poll.options[option] === undefined){
        poll.options.push({name: option, votes: 0})
        option=poll.options.length-1;
        console.log(poll.options);
      }
      user.voted[pollname] = option;
      poll.options[option].votes += 1;

      fs.writeFile("users/" + username + ".json", JSON.stringify(user));

      fs.writeFile("polls/" + pollname, JSON.stringify(poll), function (err) {
        cb();
      });
    })
  })
}


app.get('/', function (req, res) {
  fs.readFile(__dirname + "/home.html", function (err, page) {
    var buffer = "";
    fs.readdirSync("polls").forEach(function (v, i, a) {
      fs.readdirSync("polls/" + v).forEach(function (v2, i2, a2) {
        var data = JSON.parse(fs.readFileSync("polls/" + v + "/" + v2))
        buffer += `<div class="card">
        <h3 class="card-header">Poll by ${data.creator}</h3>
        <div class="card-block">
            <h4 class="card-title">${data.question}</h4>
            <p class="card-text">Vote ${data.options.length} options</p>
            <a href="/${v}/${v2}" class="btn btn-primary">Vote!</a>
        </div>
    </div>`;
      })
    })

    var logindata = ".yesauth";
    if (req.user) {
      logindata = ".noauth";
    }
    res.send(page.toString().replace(".yesauth", logindata).replace("{{data}}", buffer));
  });

});
app.get('/logout', function (req, res) {
  req.session.destroy(function (err) {
    res.redirect('/'); //Inside a callback… bulletproof!
  });
});
app.get('/user', function (req, res) {
  if (!req.user) {
    res.redirect("/");
    return;
  }
  fs.readFile(__dirname + "/home.html", function (err, page) {
    var buffer = "<a href='/newpoll'>Create new poll</a><hr>";
    fs.readdirSync("polls/" + req.user.id).forEach(function (v2, i2, a2) {
      var data = JSON.parse(fs.readFileSync("polls/" + req.user.id + "/" + v2))
      buffer += `<div class="card">
        <h3 class="card-header">Poll by ${data.creator}</h3>
        <div class="card-block">
            <h4 class="card-title">${data.question}</h4>
            <p class="card-text">Vote ${data.options.length} options</p>
            <a href="/${req.user.id}/${v2}" class="btn btn-primary">View</a>
            <a href="/${req.user.id}/${v2}/delete" class="btn btn-danger">Delete</a>
        </div>
    </div>`;
    })

    var logindata = ".yesauth";
    if (req.user) {
      logindata = ".noauth";
    }
    res.send(page.toString().replace(".yesauth", logindata).replace("{{data}}", buffer));
  });
});
app.get('/:user/:poll/delete', function (req, res) {
  if (req.params.user == req.user.id) {
    fs.unlinkSync("polls/" + req.params.user + "/" + req.params.poll);
    res.redirect("/user");
  }
});
app.get('/newpoll', function (req, res) {
  fs.readFile(__dirname + "/home.html", function (err, page) {
    var buffer = `<form method="POST">
  <div class="form-group" >
    <label for="question">Question:</label>
    <input type="text" class="form-control" name="question">
  </div>

  <div class="form-group">
    <label for="options">Options (seperate by ";;")</label>
    <input type="text" class="form-control" name="options">
  </div>

  <button type="submit" class="btn btn-default">Submit</button>
</form>`;
    var logindata = ".yesauth";
    if (req.user) {
      logindata = ".noauth";
    }
    res.send(page.toString().replace(".yesauth", logindata).replace("{{data}}", buffer));

  });

});
app.post('/newpoll', function (req, res) {
  if (req.user) {
    var newpoll = {
      question: req.body.question,
      time: Date.now(),
      creator: req.user.displayName,
      options: []
    }
    console.log(req.body);
    req.body.options.split(";;").forEach(function (v, i, a) {
      newpoll.options.push({ name: v, votes: 0 });
    });
    fs.writeFile("polls/" + req.user.id + "/" + sha1(newpoll.question + req.user.id) + ".json", JSON.stringify(newpoll), function (err) {
      res.redirect(req.user.id + "/" + sha1(newpoll.question + req.user.id) + ".json");
    });
  }
});
app.all('/:user/:poll', function (req, res) {
  if (req.method == "POST") {

    var user = req.connection.remoteAddress;
    if (req.user) {
      user = req.user.displayName
    }
    if (req.user || !isNaN(req.body.option)) {

      vote(user, req.params.user + "/" + req.params.poll, req.body.option, () => {
        res.redirect("?voted");
      })
    }
  } else {
    fs.readFile(__dirname + "/home.html", function (err, page) {
      fs.readFile(__dirname + "/polls/" + req.params.user + "/" + req.params.poll, function (err, _poll) {
        var poll = JSON.parse(_poll);
        var optionshtml = "";
        var voteoptions = "";
        poll.options.forEach(function (v, i, a) {
          optionshtml += `<label class="radio-inline"><input checked type="radio" value="${i}" name="option">${v.name}</label> `
          voteoptions += "['" + v.name + "',  " + v.votes + "],"
        });
        var buffer = `
      <div class="jumbotron">
  <h1 class="display-3">${poll.question}</h1>
  <div id="piechart" style="width: 900px; height: 500px;"></div>
  <hr>
  <form method="POST">
  ${optionshtml}
  <p class="lead">
    <button class="btn btn-primary btn-lg" type="submit">Vote</button>
  </p>
  </form>

  <form method="POST" class="yesauth">
  <h2>Custom options, logged-in users only</h2>
  <p class="lead">
    <input placeholder="Custom option" name="option">
    <button class="btn btn-primary btn-lg" type="submit">Vote</button>
  </p>
  </form>
</div>
    `;
        var logindata = ".yesauth";
        if (req.user) {
          logindata = ".noauth";
        }
        res.send(page.toString().replace(".yesauth", logindata).replace("{{data}}", buffer).replace("</head>", `
        <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
    <script type="text/javascript">
      google.charts.load('current', {'packages':['corechart']});
      google.charts.setOnLoadCallback(drawChart);
      function drawChart() {

        var data = google.visualization.arrayToDataTable([
          ['Option', 'Votes'],
          ${voteoptions}
        ]);

        var options = {
          title: '${poll.question}'
        };

        var chart = new google.visualization.PieChart(document.getElementById('piechart'));

        chart.draw(data, options);
      }
    </script>
      </head>`));
      });
    });
  }

});

app.listen(process.env.PORT || 3000, function () {
  console.log('App ready!');
});
