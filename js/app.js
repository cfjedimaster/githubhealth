/* jshint undef: true, unused:true */
/* global $,document,hello,console,Handlebars,moment */
var repos = [];
var repoTemplate;

$(document).ready(function() {
    
    $("#authButton").on("click", function() {
       hello('github').login().then(function() {
		   
	   }, function(e) {
		 console.log('Error',e);  
	   });
    });
    
    var templateSource = $("#repoTemplate").html();
    repoTemplate = Handlebars.compile(templateSource);
    
});

hello.init(
    {  
        github : "aa66c1bfda788d65339b"
    },
    {
        redirect_uri:'redirect.html',
        oauth_proxy : 'https://auth-server.herokuapp.com/proxy'
    }
);

hello.on('auth.login', function(auth) {
	console.log("ok im auth");
    $("#loginDiv").hide();

	hello( auth.network ).api( '/me' ).then( function(r) {
        console.log("profile info");
        console.log(r);
        $("#profileDiv .panel-title").text(r.name);
        $("#profileDiv img").attr("src",r.avatar_url);
        
        //Create a basic description
        var desc = "<p>";
        desc += "You joined GitHub on "+dateFormat(r.created_at,'MMMM D, YYYY') + ". ";
        desc += "You currently have "+r.followers+" followers and are following "+r.following+" other users. ";
        desc += "You work with "+r.public_repos+" public repositories. We'll now start analyzing those projects.";
        desc += "</p>";
        $("#profileDiv .panel-body").append(desc);
        
        $("#profileDiv").show();
        $("#filterDiv").show();
        
        $("#filterDiv input[type=checkbox]").on("change", doFilter);
        
        startFetchingRepositories();
	});

});

function startFetchingRepositories(path) {
    if(!path) path = '/user/repos';
    console.log('fetching repos with '+path);
    hello('github').api(path,{"type":"owner"}).then( function(r){
        Array.prototype.push.apply(repos, r.data);
        console.dir(r.data[0]);
        if(r.paging && r.paging.next) {
            startFetchingRepositories(r.paging.next);   
        } else {
            displayRepos();   
        }
    });

}

function displayRepos() {
    console.log('hello');
    console.dir(repos);
    var display = $("#results");
    
    var aggData = {};
    aggData.oldest = {age:0};
    aggData.open_issues = 0;
    
    repos.forEach(function(repo) {
        console.log('work it');

        //massage some of the data
        if(!repo.name) {
            //oddly, name is missing, but not full_name
            repo.name = repo.full_name.split("/").pop();
        }
        repo.created = dateFormat(repo.created_at,'MM/DD/YY');
        repo.lastupdated = dateFormat(repo.updated_at, 'MM/DD/YY');
        repo.lastago = moment().diff(repo.updated_at,'days');
        
        if(repo.lastago > aggData.oldest.age) {
            aggData.oldest.age = repo.lastago;
            aggData.oldest.name = repo.name;
        }
        aggData.open_issues += repo.open_issues_count;
        
        repo.level = determineLevel(repo);
        var html = repoTemplate(repo);
        display.append(html);
    });
    
    //append some agg data
    var aggText = "<p>Your oldest project is "+aggData.oldest.name + " at "+aggData.oldest.age + " days old.<br/>";
    aggText += "You currently have <strong>"+aggData.open_issues+"</strong> open issues.</p>";
    
    $("#profileDiv .panel-body").append(aggText);

}

function dateFormat(d,format) {
    return moment(d).format(format);
}

/*
I take in a data object (right now it's the crap I'm sending to the template, not the full github

I'm a bootstrap class representing how 'bad' the repo is
range from bad to good is: danger (red), warning (yellow), default(gray), info (blue), success (green)
I didn't do primary, too bright
*/
function determineLevel(data) {
    //points are bad. you don't want points
    var points = 0;
    
    //First rule, check age
    if(data.lastago > 360) {
        points += 7;
    } else if(data.lastago > 160) {
        points += 5;
    } else if(data.lastago > 120) {
        points += 3;
    } else if(data.lastago > 60) {
        points += 1;
    }

    //check open issues
    if(data.open_issues_count > 50) {
        points += 4;
    } else if(data.open_issues_count > 25) {
        points += 2;
    } else if(data.open_issues_count > 10) {
        points += 1;   
    }
    
    switch(points) {
        case 0: return "success";
        case 1:
        case 2: return "info";
        case 3:
        case 4: return "default";
        case 5:
        case 6: return "warning";
        default: return "danger";    
    }
    
}

function doFilter() {
    //get all the checked checkboxes and determine the state
    var show = { "success":false, "info":false, "default":false, "warning": false, "danger":false};
    var selected = $("#filterDiv input[type=checkbox]:checked");
    for(var i=0; i<selected.length; i++) {
        var cb = selected.eq(i);
        var filter = cb.data("filter");
        show[filter] = true;
    }
    console.log(show);
    
    if(show.success) $(".repo.panel-success").show();
    else $(".repo.panel-success").hide();

    if(show.info) $(".repo.panel-info").show();
    else $(".repo.panel-info").hide();

    if(show["default"]) $(".repo.panel-default").show();
    else $(".repo.panel-default").hide();

    if(show.warning) $(".repo.panel-warning").show();
    else $(".repo.panel-warning").hide();

    if(show.danger) $(".repo.panel-danger").show();
    else $(".repo.panel-danger").hide();

}