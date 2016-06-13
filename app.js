VCAP_SERVICES = {};
if(process.env.VCAP_SERVICES)
	VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);

var iotf_host = VCAP_SERVICES["iotf-service"][0]["credentials"].http_host;

if(iotf_host.search('.staging.internetofthings.ibmcloud.com') > -1)
	process.env.STAGING = 1;

var express = require('express');
var cfenv = require('cfenv');
var log4js = require('log4js');

var app = express();
//set the app object to export so it can be required
module.exports = app;

var path            = require('path'),
    favicon         = require('serve-favicon'),
    logger          = require('morgan'),
    cookieParser    = require('cookie-parser'),
    bodyParser      = require('body-parser'),
    cors            = require('cors'),
    routes          = require('./routes/index'),
    device          = require('./routes/device'),
    simulator       = require('./routes/simulator'),
    http            = require('http'),
    request         = require('request'),
    _               = require("underscore"),
    appEnv          = cfenv.getAppEnv(),
    q               = require('q');

var jsonParser = bodyParser.json();
var i18n = require("i18n");

i18n.configure({
    directory: __dirname + '/locales',
    defaultLocale: 'en',
    queryParameter: 'lang',
    objectNotation: true,
    fallbacks: {
      'pt'   : 'pt_BR',
      'pt-BR': 'pt_BR',
      'zh-CN': 'zh_CN',
      'zh-TW': 'zh_TW'
    },
    prefix: 'electronics-'
});

dumpError = function(msg, err) {
	if (typeof err === 'object') {
		msg = (msg) ? msg : "";
		var message = "***********ERROR: " + msg + " *************\n";
		if (err.message) {
			message += '\nMessage: ' + err.message;
		}
		if (err.stack) {
			message += '\nStacktrace:\n';
			message += '====================\n';
			message += err.stack;
			message += '====================\n';
		}
		console.error(message);
	} else {
		console.error('dumpError :: argument is not an object');
	}
};

//The IP address of the Cloud Foundry DEA (Droplet Execution Agent) that hosts this application:
var host = (process.env.VCAP_APP_HOST || 'localhost');

//Add a handler to inspect the req.secure flag (see
//http://expressjs.com/api#req.secure). This allows us
//to know whether the request was via http or https.
app.use(function (req, res, next) {
	res.set({
		'Cache-Control': 'no-store',
		'Pragma': 'no-cache'
	});
	//force https
	if(!appEnv.isLocal && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] == 'http')
		res.redirect(308, 'https://' + req.headers.host + req.url);
	else
		next();
});

//allow cross domain calls
app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(i18n.init);

app.use(function(req, res, next){
  if(req.query.mocked === 'true'){
    var locale = req.getLocale();
    req.setLocale('mocked_' + req.getLocale());
    if(req.getLocale() !== 'mocked_' + locale){
      req.setLocale(locale);
    }
    next();
  } else {
    next();
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/', device);
app.use('/', simulator);

//Get credentials of related services.
//Get IoTP credentials
if(!VCAP_SERVICES || !VCAP_SERVICES["iotf-service"])
	throw "Cannot get IoT-Foundation credentials"
var iotfCredentials = VCAP_SERVICES["iotf-service"][0]["credentials"];

//Get IoT for Electronics credentials
if(!VCAP_SERVICES || !VCAP_SERVICES["ibmiotforelectronics"])
	throw "Cannot get IoT4E credentials"
var iotECredentials = VCAP_SERVICES["ibmiotforelectronics"][0]["credentials"];

//IoT Platform Credentials
var name = iotfCredentials["org"];
var orgId = iotfCredentials["org"];
var apiKey = iotfCredentials["apiKey"];
var authToken = iotfCredentials["apiToken"];
var baseURI = iotfCredentials["base_uri"];
var apiURI = 'https://' + iotfCredentials["http_host"] + ':443/api/v0002';
var iotpHttpHost = iotfCredentials["http_host"];

//IoT for Electronics Credentials
var iotETenant = iotECredentials["tenantID"];
var iotEAuthToken = iotECredentials["authToken"];
var iotEApiKey = iotECredentials["apiKey"];

/***************************************************************/
//STEPHANIES'S CODE *************
/***************************************************************/
/***************************************************************/

// SETUP CLOUDANT
//Key whichispermandencellansp
//Password a8ba75e7534498a85a9f0c11adbe11e09ae03177 //
var id = 'ca15409e-9847-4b9e-9d8c-ec26c4cf01ae-bluemix';
var pword = 'f1ad812df21ef96a09dbfbaff6de261e3085b0a5da0518bede7ab69a1caff3f7';
var host  = 'ca15409e-9847-4b9e-9d8c-ec26c4cf01ae-bluemix.cloudant.com';
var CLOUDANT_URL='https://' + id + ':' + pword + '@' + host;
var dbname   = 'iot_for_electronics_registration';

var passport   = require('passport');
var MCABackendStrategy = require('bms-mca-token-validation-strategy').MCABackendStrategy;
var Cloudant   = require('cloudant');

var services = JSON.parse(process.env.VCAP_SERVICES)
var application = JSON.parse(process.env.VCAP_APPLICATION)
var currentOrgID = iotfCredentials["org"];

var cloudant = Cloudant(CLOUDANT_URL, function(err,cloudant){
	db = cloudant.db.use(dbname);
	//make sure it is created
	cloudant.db.get(dbname, function(err, body) {
		if(err){
			console.log('creating ' + dbname);
			cloudant.db.create(dbname, function(err,body) {
				if (!err)
					console.log('DB created ');
				else
					console.error('Err creating DB ' + err );
			});
		}
		else {
			console.log("connected to DB");
		}
});
});

/***************************************************************/
/* Set up express server & passport                            */
/***************************************************************/
passport.use(new MCABackendStrategy());
app.use(passport.initialize());

const https = require('https');



/***************************************************************/
/* Route to update 1 user document in Cloudant                 */
/*					        	       */
/* Input: url params that contains the userID 		       */
/* Returns:  404 for user not found, 200 for success           */
/***************************************************************/
app.put('/users', passport.authenticate('mca-backend-strategy', {session: false }), function(req, res)
{
	//var formData = req.body;
	var userDocIn = JSON.parse(JSON.stringify(req.body)); 
	userDocIn.orgID = currentOrgID;
	
	//verify that userID coming in MCA matches doc userID
	if (userDocIn.userID != req.user.id)
	{
		res.status(500).send("User ID in request does not match MCA authenticated user.")
		console.log("doc userID and mca userID do not match")
	}
	request({
   		url: 'https://iotforelectronicstile.stage1.mybluemix.net/users/internal',
		json: userDocIn,
		method: 'PUT', 
		headers: {
    				'Content-Type': 'application/json',
    				'tenantID':iotETenant,
    				'orgID':currentOrgID
  		},
  		auth: {user:iotEApiKey, pass:iotEAuthToken}

    	}, function(error, response, body){
    		if(error) {
        		console.log('ERROR: ' + error);
			console.log('BODY: ' + error);
        		res.status(500).send(response);
    		} else {
        		console.log(response.statusCode, body);
        		res.status(200).send(response);
		}});
});

/********************************************************/
/* Admin. function specifically for adding a user doc   */
/* on mobile login, when one doesn't already exist      */
/* for the user logging in                              */
/********************************************************/
createUser = function (username)
{
	console.log("inside createUser function");
	//first see if the user exists
	var options =
	{
		url: ('https://iotforelectronicstile.stage1.mybluemix.net/users/internal/'+ username),
		method: 'GET',
		headers: {
    				'Content-Type': 'application/json',
    				'tenantID':iotETenant,
    				'orgID':currentOrgID
  		},
  		auth: {user:iotEApiKey, pass:iotEAuthToken}
	};
	request(options, function (error, response, body) {
	    if (!error && response.statusCode == 200) {
	    	//we already have a user, so do nothing
        	console.log('User exists, wont create one.' + body);
        	return;
	    }else if (error){
        	console.log("The request came back with an error: " + error);
        	return;
        	}else{
        		//no user doc found, register this user
        		userDoc = {};
        		userDoc.orgID = currentOrgID;
        		userDoc.userID = username;
			request({
   				url: 'https://iotforelectronicstile.stage1.mybluemix.net/users/internal',
				json: userDoc,
				method: 'POST', 
				headers: {
    						'Content-Type': 'application/json',
    						'tenantID':iotETenant,
    						'orgID':currentOrgID
  				},
  				auth: {user:iotEApiKey, pass:iotEAuthToken}

	    		}, function(error, response, body){
	    			if(error) {
	        			console.log('ERROR: ' + error);
					console.log('BODY: ' + error);
					return;
    				} else {
		        		console.log(response.statusCode, body);
		        		return;
				}
    		   	});
        	}
        });
}


/***************************************************************/
/* Route to get 1 user document from Cloudant (1)              */
/*					  		   	*/
/* Input: url params that contains the userID 			 */
/* Returns: 200 for found user, 404 for user not found         */
/***************************************************************/
app.get('/users/:userID', passport.authenticate('mca-backend-strategy', {session: false }), function(req, res)
{
	//make sure userID on params matches userID coming in thru MCA
	if (req.params.userID != req.user.id)
	{
		res.status(500).send("User ID on request does not match MCA authenticated user.")
	}
	var options =
	{
		url: ('https://iotforelectronicstile.stage1.mybluemix.net/users/internal/'+ req.user.id), 
		method: 'GET',
		headers: {
    				'Content-Type': 'application/json',
    				'tenantID':iotETenant,
    				'orgID':currentOrgID
  		},
  		auth: {user:iotEApiKey, pass:iotEAuthToken}
	};
	request(options, function (error, response, body) {
	    if (!error && response.statusCode == 200) {
        	// Print out the response body
        	console.log(body);
        	res.status(response.statusCode).send(response);
	    }else{
        	console.log("The request came back with an error: " + error);
        	//for now I'm giving this a 500 so that postman won't be left hanging.
        	res.status(response.statusCode).send(response);
        	return;
        	}
        	
        	});
});


/***************************************************************/
/* Route to add 1 user document to Cloudant.   (2)             */
/*                                                             */
/* Input: JSON structure that contains the userID, name,       */
/*             address, and telephone			       */
/***************************************************************/
// passport.authenticate('mca-backend-strategy', {session: false }),
app.post("/users", passport.authenticate('mca-backend-strategy', {session: false }),  function (req, res)
{
	//var formData = req.body;
	var formData = JSON.parse(JSON.stringify(req.body)); 
	formData.orgID = currentOrgID;
	
	//verify that userID coming in MCA matches doc userID
	if (formData.userID != req.user.id)
	{
		res.status(500).send("User ID in request does not match MCA authenticated user.")
		//might need a return here, needs test
		//see if logic ^ works first before finishing this
		console.log("doc userID and mca userID do not match")
	}
	request({
   		url: 'https://iotforelectronicstile.stage1.mybluemix.net/users/internal',
		json: formData,
		method: 'POST', 
		headers: {
    				'Content-Type': 'application/json',
    				'tenantID':iotETenant,
    				'orgID':currentOrgID
  		},
  		auth: {user:iotEApiKey, pass:iotEAuthToken}

    	}, function(error, response, body){
    		if(error) {
        		console.log('ERROR: ' + error);
			console.log('BODY: ' + error);
        		res.status(response.statusCode).send(response);
    		} else {
        		console.log(response.statusCode, body);
        		res.status(response.statusCode).send(response);
		}});
});


/***************************************************************/
/* Route to add 1 appliance document to registration Cloudant.(3) */
/*                                                             */
/* Input: JSON structure that contains the userID, applianceID,*/
/*             serial number, manufacturer, and model          */
/***************************************************************/
app.post('/appliances', passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	var bodyIn = JSON.parse(JSON.stringify(req.body)); 
   	bodyIn.userID = req.user.id;
   	bodyIn.orgID = currentOrgID;
	
	//verify that userID coming in MCA matches doc userID
	if (bodyIn.userID != req.user.id)
	{
		res.status(500).send("User ID in request does not match MCA authenticated user.")
		//might need a return here, needs test
	}
	request({
		url: 'https://iotforelectronicstile.stage1.mybluemix.net/appliances/internal',
		json: bodyIn,
		method: 'POST', 
		headers: {
    				'Content-Type': 'application/json',
    				'tenantID':iotETenant,
    				'orgID':currentOrgID
  		},
  		auth: {user:iotEApiKey, pass:iotEAuthToken}
		}, function(error, response, body){
			if(error) {
				console.log('ERROR: ' + error);
				console.log('BODY: ' + error);
				res.status(response.statusCode).send(response);
			} else {
				console.log(response.statusCode, body);
				res.status(response.statusCode).send(response);
			}
		});
});


/***************************************************************/
/* Route to show one user doc using Cloudant Query             */
/* Takes a userID in the url params                            */
/***************************************************************/
app.get('/user/:userID', passport.authenticate('mca-backend-strategy', {session: false }), function(req, res)
{
	//make sure userID on params matches userID coming in thru MCA
	if (req.params.userID != req.user.id)
	{
		res.status(500).send("User ID on request does not match MCA authenticated user.")
		//might need a return here, needs test
	}
	
	var options =
	{
		url: ('https://iotforelectronicstile.stage1.mybluemix.net/user/internal/'+ req.params.userID),
		method: 'GET',
		headers: {
    				'Content-Type': 'application/json',
    				'tenantID':iotETenant,
    				'orgID':currentOrgID
  		},
  		auth: {user:iotEApiKey, pass:iotEAuthToken}
	};
	request(options, function (error, response, body) {
	    if (!error) {
        	// Print out the response body
        	console.log(body);
        	res.status(response.statusCode).json(body);
	    }else{
        	console.log("The request came back with an error: " + error);
        	//for now I'm giving this a 500 so that postman won't be left hanging.
        	res.status(response.statusCode).send(response);
        	return;
        	}
        	
        	});
});


/***************************************************************/
/* Route to list all appliance documents for given user   (4)  */
/*       													   */
/* Input: Query string with userID and optional applianceID    */
/***************************************************************/
app.get('/appliances/:userID', passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	//make sure userID on params matches userID coming in thru MCA
	if (req.params.userID != req.user.id)
	{
		res.status(500).send("User ID on request does not match MCA authenticated user.")
		//might need a return here, needs test
	}
	var options =
	{
		url: ('https://iotforelectronicstile.stage1.mybluemix.net/appliances/internal/'+ req.user.id),
		method: 'GET',
		headers: {
    				'Content-Type': 'application/json',
    				'tenantID':iotETenant,
    				'orgID':currentOrgID
  		},
  		auth: {user:iotEApiKey, pass:iotEAuthToken}
	};
	request(options, function (error, response, body) {
	    if (!error) {
        	// Print out the response body
        	console.log("body: " + body);
        	console.log("response: " + response);
        	res.status(response.statusCode).send(body);
	    }else{
        	console.log("The request came back with an error: " + error);
        	//for now I'm giving this a 500 so that postman won't be left hanging.
        	res.status(response.statusCode).send(response);
        	return;
        	}
        	
        	});
});


/****************************************************************************/
/* Route to list 1 appliance document for given userID and applianceID (4)  */
/*       													   				*/
/* Input: Query string with userID and optional applianceID    				*/
/****************************************************************************/
app.get("/appliances/:userID/:applianceID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	//make sure userID on params matches userID coming in thru MCA
	if (req.params.userID != req.user.id)
	{
		res.status(500).send("User ID on request does not match MCA authenticated user.")
		//might need a return here, needs test
	}
	var options =
	{
		url: ('https://iotforelectronicstile.stage1.mybluemix.net/appliances/internal2/'+ req.user.id + '/' + req.body.applianceID),
		method: 'GET',
		headers: {
    				'Content-Type': 'application/json',
    				'tenantID':iotETenant,
    				'orgID':currentOrgID
  		},
  		auth: {user:iotEApiKey, pass:iotEAuthToken}
	};
	request(options, function (error, response, body) {
	    if (!error) {
        	// Print out the response body
        	console.log(body);
        	res.status(response.statusCode).json(body);
	    }else{
        	console.log("The request came back with an error: " + error);
        	//for now I'm giving this a 500 so that postman won't be left hanging.
        	res.status(response.statusCode).send(response);
        	return;
        	}
        	
        	});
});

/***************************************************************/
/* Route to delete appliance records                           */
/*    Internal API											   */
/***************************************************************/
app.del("/appliances/:userID/:applianceID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	//DOING THIS DELETE HOW WE DO POSTS ABOVE
	//will need to test to see which works (or which works better)
	
	//verify that userID coming in MCA matches doc userID
	if (req.params.userID != req.user.id)
	{
		res.status(500).send("User ID in request does not match MCA authenticated user.")
		//might need a return here, needs test
	}
	request({
		url: ('https://iotforelectronicstile.stage1.mybluemix.net/appliances/internal2/'+ req.params.userID + '/' + req.params.applianceID),
		method: 'DELETE', 
		headers: {
    				'Content-Type': 'application/json',
    				'tenantID':iotETenant,
    				'orgID':currentOrgID
  		},
  		auth: {user:iotEApiKey, pass:iotEAuthToken}
		}, function(error, response, body){
			if(error) {
				console.log('ERROR: ' + error);
				console.log('BODY: ' + error);
				res.status(response.statusCode).send(response);
			} else {
				console.log(response.statusCode, body);
				res.status(response.statusCode).send(response);
			}
		});
});



/**************************************************************************************** **/
/* Route to delete user documents.                              						   */
/* Need to delete the appliance documents as well from our db  							   */
/* If we created them on the platform, delete from platform (NOT for experimental)         */
/*******************************************************************************************/
app.delete("/user/:userID", passport.authenticate('mca-backend-strategy', {session: false }), function (req, res)
{
	//DOING THIS DELETE HOW WE DO GETS ABOVE
	//make sure userID on params matches userID coming in thru MCA
	if (req.params.userID != req.user.id)
	{
		res.status(500).send("User ID on request does not match MCA authenticated user.")
		//might need a return here, needs test
	}
	var options =
	{
		url: ('https://iotforelectronicstile.stage1.mybluemix.net/user/internal/'+ req.user.id),
		method: 'DELETE',
		headers: {
    				'Content-Type': 'application/json',
    				'tenantID':iotETenant,
    				'orgID':currentOrgID
  		},
  		auth: {user:iotEApiKey, pass:iotEAuthToken}
	};
	request(options, function (error, response, body) {
	    if (!error) {
        	// Print out the response body
        	console.log(body);
        	res.status(response.statusCode).send(response);
	    }else{
        	console.log("The request came back with an error: " + error);
        	//for now I'm giving this a 500 so that postman won't be left hanging.
        	res.status(response.statusCode).send(response);
        	return;
        	}
        	
        	});
});

//get IoT-Foundation credentials

/********************************************************************** **/
/*End of Registration Integrator Code                                               */
/********************************************************************** **/

/*
 * CONRAD'S CODE
 */

//Using hardcoded user repository
var userRepository = {
    "conrad":      { password: "12345" , displayName:"Conrad Kao"      , dob:"October 9, 1940"},
    "john.lennon":      { password: "12345" , displayName:"John Lennon"      , dob:"October 9, 1940"},
    "paul.mccartney":   { password: "67890" , displayName:"Paul McCartney"   , dob:"June 18, 1942"},
    "ringo.starr":      { password: "abcde" , displayName:"Ringo Starr"      , dob: "July 7, 1940"},
    "george.harrison":  { password: "fghij" , displayName: "George Harrison" , dob:"Feburary 25, 1943"}
};

var logger = log4js.getLogger("CustomIdentityProviderApp");
logger.info("Starting up");

app.post('/apps/:tenantId/:realmName/startAuthorization', jsonParser, function(req, res){
    var tenantId = req.params.tenantId;
    var realmName = req.params.realmName;
    var headers = req.body.headers;

    logger.debug("startAuthorization", tenantId, realmName, headers);

    var responseJson = {
        status: "challenge",
        challenge: {
            text: "Enter username and password"
        }
    };

    res.status(200).json(responseJson);
});

app.post('/apps/:tenantId/:realmName/handleChallengeAnswer', jsonParser, function(req, res){
    var tenantId = req.params.tenantId;
    var realmName = req.params.realmName;
    var challengeAnswer = req.body.challengeAnswer;

    logger.debug("handleChallengeAnswer", tenantId, realmName, challengeAnswer);

    var username = req.body.challengeAnswer["username"];
    var password = req.body.challengeAnswer["password"];

    var responseJson = { status: "failure" };

    //add the following lines to add a new user (temporily) when the username is not existed.
    if (userRepository[username] == null) {
        userRepository[username]={password: password, displayName: username, dob:"December 31, 2016"};
    }

    var userObject = userRepository[username];

    if (userObject && userObject.password == password ){
        logger.debug("Login success for userId ::", username);
        responseJson.status = "success";
        responseJson.userIdentity = {
            userName: username,
            displayName: userObject.displayName,
            attributes: {
                dob: userObject.dob
            }
        };
        //create a user doc for this user if one doesn't already exist
        createUser(username);
    	} else {
	        logger.debug("Login failure for userId ::", username);
    	}
	
    	res.status(200).json(responseJson);
});


/********************************************************************** **/
/*Solution Integrator Code                                               */
/********************************************************************** **/
  //Get RTI credentials
// if(!VCAP_SERVICES || !VCAP_SERVICES["IoT Real-Time Insight"])
//  	throw "Cannot get RTI credentials"
// var rtiCredentials = VCAP_SERVICES["IoT Real-Time Insight"][0]["credentials"];

//RTI Credentials
//  var rtiApiKey = rtiCredentials["apiKey"];
//  var rtiAuthToken = rtiCredentials["authToken"];
//  var rtiBaseUrl = rtiCredentials["baseUrl"];
//  var disabled = false;

//Stephanie's deletedDoc Doc creation for Metering
console.log('Creating doc to track deleted docs');
var urlDel = 'https://iotforelectronicstile.stage1.mybluemix.net/deletedDocs/' + currentOrgID;
console.log('Deleted Docs API URL:', urlDel);
request
  .get(urlDel, {timeout: 3000})
  .on('response', function(response){
    console.log('Response received.');
  })
  .on('error', function(error){
    if(error.code === 'ETIMEDOUT')
      console.log('Request timed out.');
    else
      console.log(error);
  }); 
  
console.log('About to store IoTP Credentials');
var url = ['https://iotforelectronicstile.stage1.mybluemix.net/credentials', currentOrgID, apiKey, authToken, iotpHttpHost, iotEAuthToken,iotEApiKey].join('/');
console.log('Credentials API URL:', url);
request
  .get(url, {timeout: 3000})
  .on('response', function(response){
    console.log('Response received.');
  })
  .on('error', function(error){
    if(error.code === 'ETIMEDOUT')
      console.log('Request timed out.');
    else
      console.log(error);
  }); 

/***************************************************************/
/* Route to show one user doc using Cloudant Query             */
/* Takes a userID in the url params                            */
/***************************************************************/
app.get('/validation', function(req, res)
{
	var options =
	{
		url: 'https://iotforelectronicstile.stage1.mybluemix.net/validation/' + iotETenant + '/' +  iotEAuthToken + '/' + iotEApiKey,
		auth: iotEAuthToken + ':' + iotEApiKey,
		method: 'GET',
		headers: {
    				'Content-Type': 'application/json'
  		}
	};
	request(options, function (error, response, body) {
	    if (!error && response.statusCode == 200) {
        	// Print out the response body
        	console.log(body);
        	//response.status(200).send("Successful test GET")
	    }else{
        	console.log(error);
        	//response.status(error.statusCode).send("ERROR on test GET")
        	}
        	
        	});
});
// //var iotePass = ioteCredentials["password"];

// //IoT Platform Device Types
// //var	iotpDevId = "washingMachine";
// //var	iotpDescription = "IoT4E Washing Machine";
// //var	iotpClassId = "Device"

// //RTI Message Schema Info
// //var	rtiSchemaName = "Electronics";

// //IoT Platform Config Creation Method.
  var iotpPost = function iotpPost (path, json) {
  console.log('calling api to POST: ' + baseURI);
  console.log('IoTP API URI: ' + apiURI);
  console.log('calling api on json: ' + JSON.stringify(json));

    var url = apiURI + path;
    var defer = q.defer();
    var body = '';

    request
     .post({
        url: url,
        json: true,
        body: json
      }).auth(apiKey, authToken, true)
      .on('data', function(data) {
        body += data;
      })
      .on('end', function() {
        var json = JSON.parse(body);
        defer.resolve(json);
     })
     .on('response', function(response) {
        console.log('IoTP status: ' + response.statusCode);
    });
     return defer.promise;
  };

 // //RTI Config Creation Method.
  var rtiPost = function rtiPost (path, json) {
    console.log('calling api to baseURL: ' + rtiBaseUrl);
    console.log('calling api to Path ' + path);
    console.log('Rti Api: ' + rtiApiKey);
    console.log('Rti Token: ' + rtiAuthToken);
    console.log('calling api on json: ' + JSON.stringify(json));

    var url = rtiBaseUrl + path;
    var defer = q.defer();
    var body = '';

    request
     .post({
        url: url,
        json: true,
        body: json
      }).auth(rtiApiKey, rtiAuthToken, true)
     .on('data', function(data) {
        body += data;
      })
      .on('end', function() {
        var json = JSON.parse(body);
        defer.resolve(json);
     })
     .on('response', function(response) {
        console.log('`RTI status: ' + response.statusCode); // 200
    });
     return defer.promise;
   };

//IoT Platform device type creation call
 var iotpDeviceType = iotpPost('/device/types',{
 	"id": "washingMachine",
 	"description": "IoT4E Washing Machine",
	"classId": "Device"
});

// //IoT Platform device creation call
// //var iotpDeviceType = iotpPost('/device/types/washingMachine/devices',{
// //  //"id": "d:abc123:myType:myDevice",
// //  "typeId": "washingMachine",
// //  "deviceId": "washingMachineElec"
// //});

//RTI data source creation call
/*var rtiSource = rtiPost('/message/source',{
	"name": name,
	"orgId": orgId,
	"apiKey": apiKey,
	"authToken": authToken,
	"disabled": disabled})
		.then(function(json) {
			console.log('RTI Source Return: ' + JSON.stringify(json));
			var sourceValues = JSON.parse(JSON.stringify(json)); 
			console.log('RTI Source ID: ' + sourceValues.id);
			//RTI schema creation call
			  var rtiSchema = rtiPost('/message/schema',{
			  	"name": "Electronics",
			  	"format": "JSON",
			  	"items": []})
			  .then(function(json){
			  	console.log('RTI Schema Return: ' + JSON.stringify(json));
			  	var schemaValues = JSON.parse(JSON.stringify(json)); 
				//RTI route creation call
				  var rtiRoute = rtiPost('/message/route',{
				  	"sourceId": sourceValues.id,
				  	"deviceType": "washingMachine",
				  	"eventType": "+",
				  	"schemaId": schemaValues.id});
			  });
});*/


console.log('IoT4E Credentials: ' + iotETenant);  
/********************************************************************** **/
/*End of Solution Integrator Code                                        */
/********************************************************************** **/


//global IoT-Foundation connectors
washingMachineIoTFClient = require('./mqtt/washingMachineIoTFClient');
washingMachineIoTFClient.connectToBroker(iotfCredentials);

//var app = express();

//Enable reverse proxy support in Express. This causes the
//the "X-Forwarded-Proto" header field to be trusted so its
//value can be used to determine the protocol. See
//http://expressjs.com/api#app-settings for more details.
app.enable('trust proxy');

var server = require('http').Server(app);
iotAppMonitor = require('./lib/iotAppMonitorServer')(server);

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

//catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

//error handlers

//development error handler
//will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

//production error handler
//no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

var port = normalizePort(appEnv.port || '3000');
app.set('port', port);

//require user extensions
try {
		require("./_app.js");
	} catch (e) {
		console.log("Failed to load extention file _app.js: " + e.message);
	};

//Start server
server.listen(app.get('port'), function() {
	console.log('Server listening on port ' + server.address().port);
});
server.on('error', onError);

//set the server in the app object
app.server = server;

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string'
		? 'Pipe ' + port
				: 'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
	case 'EACCES':
		console.error(bind + ' requires elevated privileges');
		process.exit(1);
		break;
	case 'EADDRINUSE':
		console.error(bind + ' is already in use');
		process.exit(1);
		break;
	default:
		throw error;
	}
}

// app.use(function(req, res, next){
//     res.status(404).send("This is not the URL you're looking for");
// });
