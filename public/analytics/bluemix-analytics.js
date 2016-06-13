

(function() {
window._analytics = window._analytics || {};
var analytics_config =  {
"wipi" :  true,
"tealeaf" :  false,
"hotjar" :  false,
"coremetrics" :  true,
"optimizely" :  true,
"segment" :  true,
"piwik" :  false,
"googleAddServices" :  true,
"addRoll" :  true,
"videodesk" :  false,
"enabled" :  true,
"force_segment" :  false,
"facebook" :  true,
"nps" :  false,
"nps_test" :  false,
"optimizely_key" :  "3539760691",
//"segment_key" :  "2Bn4E1z8ARPAGGAH6bW9XSVy7pDpjgWp",
"segment_key" :  "MCM2j5UcFYpYVFUypa1f8C9RpWDtKohw",
};

for (var attrname in analytics_config) { 
	if ( !window._analytics.hasOwnProperty(attrname)){
		window._analytics[attrname] = analytics_config[attrname];
	}
}

})();

/*
 Functions designed to replace common JQuery functionality
 */

var _$ = _$ || {};


/*
 Fire a function when the document is ready
 */
_$.ready = function(fn) {

  if (document.readyState != 'loading'){
    return fn();
  }

  var interval = setInterval(function(){

      //Wait until the page is done loading.
      if ( document.readyState == 'loading' ){
        return;
      }

      var loading = document.querySelectorAll('body.loading, .loadingProgress');
      if ( loading.length > 0){
        return 0;
      }

      //If the page has a loading progress icon, wait for it to go away.
      var nodes = document.querySelectorAll('.loadingProgress');
      if  ( nodes.length > 0 ){
        return;
      }

      clearInterval(interval);
      fn();

  }, 500);

};

 _$.on = function(queryString, eventName, eventListener) {
	var nodes = document.querySelectorAll(queryString);
	for (var i = 0; i < nodes.length; i++) {
		var node = nodes.item(i);
		node.addEventListener(eventName, eventListener);
	}
};

/*
 A modified version of the _$.on function for dynamic content.

 The function adds a listener to the body and checks each event to 
 see if it belong to the original query string. This allows events on dynamic 
 content to be captured.
 */
_$.at = function(queryString, eventName, eventListener){

   _$.on( 'body', eventName, function(evt){
        var element = evt.target;
        while (element){
          if (_$.selectorMatches(element, queryString )){
            return eventListener(element);
          }
          else{
            element = element.parentElement;
          }
        }
   });
};


/*
 Check to see if a given element matches a selector.
 */
_$.selectorMatches = function(el, selector) {
  var p = Element.prototype;
  var f = p.matches || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || function(s) {
    return [].indexOf.call(document.querySelectorAll(s), this) !== -1;
  };
  return f.call(el, selector);
};

/*
 Wait for an element and then attach a selector to it.
 */
_$._on_poll = function( queryString, eventName, eventListener ){

  var nodes = document.querySelectorAll(queryString);
  if ( nodes.length > 0 ){
  	return _$.on( queryString, eventName, eventListener);
  }

  var interval = setInterval(function(){
      var nodes = document.querySelectorAll(queryString);
      if ( nodes.length > 0 ){
        _$.on( queryString, eventName, eventListener);
        clearInterval(interval);
      }
  }, 250);

};

_$.text = function(queryString){
  var text;
  var node = document.querySelector(queryString);
  if ( node && node.type == 'text' ){
    text = node.value;
  }else if ( node && node.textContent ){
    text = node.textContent;
  }

  if ( text && typeof text === 'string'){
    text = text.trim();
  }

  return text;
};

_$.hasClass = function(element, cls) {
    return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
};

_$.sync_script = function(url, callback){

		console.log('Adding synchronous script: ' + url );

	    var scr = document.createElement('script');
	    scr.type = 'text/javascript';

	    var x = document.getElementsByTagName('script')[0];
        x.parentNode.insertBefore(scr, x);
	    
	    scr.onload = function(){
	    	if ( callback )
	    		callback();
	    };

	    scr.src = url;

};

_$.async_script = function(url, callback){

		console.log('Adding asynch script: ' + url );

	    var scr = document.createElement('script');
	    scr.type = 'text/javascript';
	    scr.async = true;

	    var x = document.getElementsByTagName('script')[0];
        x.parentNode.insertBefore(scr, x);
	    
	    scr.onload = function(){
	    	if ( callback )
	    		callback();
	    };

	    scr.src = url;

};

/*
 Create a new cookie.
 */
_$.setCookie = function(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
};

/*
 Return a cookie with a given name, or null.
 */
_$.getCookie =function(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) === 0) return c.substring(name.length,c.length);
    }
    return null;
};

/*
 Pub / Sub framework for analytics events
 */


_$.listeners = {};

_$.publish = function( topic, data ) {

    var listeners = _$.listeners;

    if ( !listeners[topic]){
      return;
    }
 
    var subscribers = listeners[topic];
    for ( var i = 0; i < subscribers.length; i++){
        var callback = subscribers[i];
        callback( data );
    }

    return this;
};


  _$.subscribe = function( topic, callback ) {


    if (!_$.listeners[topic]) {
      _$.listeners[topic] = [];
    }

    _$.listeners[topic].push( callback );

  };

  /*
   AJAX GET call. 
   */
  _$.get = function( url ){

    var promise = new Promise(function(resolve, reject){

      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.withCredentials = true;
      
      xhr.onreadystatechange = function() {

        if (xhr.readyState == 4 && xhr.status == 200) {
          resolve( JSON.parse( xhr.responseText ) );
        }
        else if ( xhr.readyState == 4 ){
          reject( xhr.statusText );
        }
      };

      xhr.send();

    });

    return promise;

  };

  _$.post = function( url, jsondata ){

    var promise = new Promise(function(resolve, reject){

      var xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onreadystatechange = function() {

        if (xhr.readyState == 4 && xhr.status == 200) {
          resolve( JSON.parse( xhr.responseText ) );
        }
        else if ( xhr.readyState == 4 ){
          reject( xhr.statusText );
        }
      };

      xhr.send(JSON.stringify(jsondata));

    });

    return promise;

  };

 
  _$.jsonp = function(url, callback) {

    window._jsonpCallback = function(data) {
      if (callback) {
        callback(data); /* race condition... */
      }
    }

    if (url.indexOf('?') > -1) {
      url = url + '&jsoncallback=_jsonpCallback';
    } else {
      url = url + '?jsoncallback=_jsonpCallback';
    }

    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    head.appendChild(script);

  };



/*
 Development, dynamically load the NPS widget and assign event listeners.
 */

function loadWebComponentPolyfill(){

	 	var promise = new Promise(function(resolve, reject){

	 		//Return if web components are already loaded
	 		if ( window.WebComponents){
	 			return resolve('WebComponents already loaded.');
	 		}else{
	 			reject('Web Components not found on this page.');
	 		}

		});

	 	return promise;
}

 /*
  Load the NPS widget
  */
 function loadWebComponent( location ){

 	var promise = new Promise(function(resolve, reject){

	  	//Load the Web Component
		var link_tag = document.createElement('link');
		link_tag.setAttribute('href', location);
		link_tag.setAttribute('rel','import');

		link_tag.onload = function(){
			resolve(location);
			console.log( 'Link load event');
		};

		document.head.appendChild(link_tag);

	});

	return promise;

 }


/*
 Load the NPS widget, with web component polyfills (if necessary)
 @param: The result data from calling: '/analytics/nps/service/pending/' + cf_id;
 */
function loadNPS(json, cf_id) {

	if (Object.keys(json).length === 0) {
		return;
	}

	var services = Object.keys(json).join(':');

	loadWebComponent('js/nps-widget.html').then(function() {
		//Create new web component with service name
		var body = document.querySelectorAll('body')[0];
		var widget = document.createElement('nps-widget');
		widget.setAttribute('data-services', services);
		widget.setAttribute('data-id', cf_id);
		body.appendChild(widget);
	});

}


(function() {


	/**
	 Return the Coremetrics page id.
	 Known values are: 	BLUEMIX PRICING
						IBMBLUEMIX (home)
						BLUEMIX <SOLUTIONS PAGE NAME> (solutions pages)
						Bluemix Signup
						BLUEMIX DASHBOARD

	 **/
	function getPageID(){
		var page_id;
		try{
			if ( window.digitalData.page.pageID === 'ICE - cloudoe Trial Sign Up (Bluemix)'){
				page_id = 'Bluemix Signup';
			}

			//Sanity check, check the URL as well.
			else if ( window.location.pathname.indexOf('registration') > -1 ){
				page_id = 'Bluemix Signup';
			}
			else{
		 		page_id = window.digitalData.page.pageInfo.pageID;
			}
		}catch( err ){
			console.log( 'Error retrieving page id:' + page_id );
		}
		return page_id;
	}

	/*
	 Checks which client we're using...
	 */
	function _clientType(){

		var client_type;

		var ua = navigator.userAgent;

	    if(ua.indexOf('Chrome') !== -1 )
	    {
	        client_type = 'Chrome';
	    }
	    else if(ua.indexOf('Firefox') !== -1 )
	    {
	         client_type = 'Firefox';
	    }
	    else if((ua.indexOf('MSIE') !== -1 ) ||(ua.indexOf('Trident') !== -1 ) ) //IF IE > 10
	    {
	      client_type = 'IE';
	    }
	    else if (ua.indexOf('PhantomJS') !== -1 ){
	    	client_type = 'PhantomJS';
	    }
	    else {
	       client_type = 'unknown';
	    }

	    return client_type;

	}

	/*
	 Is this Atlas (defined by the the V4 header being present)
	 */
	function getSite(){
		console.log('GET SIIIITEEEEE');

		//Bluemix Classic (V3 Header)
		//  if( document.querySelector('header.bluemix-global-header') ){
		// 	return 'BLUEMIX_CLASSIC';
		// }
		// else if ( document.querySelector('body.link') ){
		// 	return 'BLUEMIX_ATLAS';
		// }
		// //Registration Page
		// else if ( document.querySelector('body.registration') ){
		// 	return 'BLUEMIX_ATLAS';
		// }
		// else if ( ! document.querySelector('header') ){
		// 	return 'EXTERNAL_SITE';
		// }
		// else if ( document.querySelector('header').getAttribute('data-version') === 'V4' || document.querySelector('header').id === 'global-header'){
		// 	return 'BLUEMIX_ATLAS';
		// }
		//
		// return 'EXTERNAL_SITE';
		return 'IOTPLATFORM';
	}

	/*
	 Are we running on Bluemix?
	 */
	 function isBluemix(){
//	 	var site = getSite();
//	 	var bluemix = (site === 'BLUEMIX_ATLAS' || 'BLUEMIX_CLASSIC');
//	 	return bluemix;
		 return true;
	 }


	/*
	 Check the header to see if this is the authenticated header or not.
	 */
	function isAuthenticatedPage(){
		var v4_login_node = document.querySelector('.global-login');
		var v3_login_node = document.querySelector('.bluemix-login');

		var authenticated = !(v4_login_node || v3_login_node);

		return authenticated;
	}

	function getUserID(){

		var user;

		if ( window.header && window.header.accountStatus && window.header.accountStatus.userGuid ){
			user =  window.header.accountStatus.userGuid;
		}

		return user;
	}

	/*
	 Wait for Coremetrics to finish loading.
	 */
	function pollForCoremetricsReady(){

		var promise = new Promise(function(resolve, reject){

			if ( window.cmCreateElementTag  && window.cm_ClientID ){
				return resolve( window.cmCreateElementTag );
			}

			var interval = setInterval(function(){

				if ( window.cmCreateElementTag && window.cm_ClientID ){
					clearInterval( interval );
					resolve( window.cmCreateElementTag );
				}
			 }, 500);

		});

		return promise;

	}

	/*
	 Call the IBM Profile ID service to provide an ID for this system.
	 - Note, profile data may be served from cookie/cache if present -

	 @returns: A promise with the wipi value (if retrieved)
	 */
	function getWipi() {

		var url = 'https://www.ibm.com/gateway/gcp/getCreateProfile/?cb=260:cors&cc=us&lc=en&ts=1231231';

		//Check if data has been cached in a cookie, Use that if possible.
		var wipi_cookie = _$.getCookie('BLUISS');
		if ( wipi_cookie !== null && wipi_cookie != '----' ){
			console.log( 'WIPI returned from cookie: ' + wipi_cookie );
			return Promise.resolve(wipi_cookie);
		}

		//No data available. Call out to profile creation service
		var promise = new Promise(function(resolve, reject){

			var invocation = new XMLHttpRequest();
			invocation.open('GET', url, true);
			invocation.withCredentials = true;

			invocation.onreadystatechange = function() {

				if (invocation.readyState == 4 && invocation.status == 200) {

					var data = JSON.parse( invocation.responseText );

				    var cookie = _$.setCookie('BLUISS', data.pid, {
	                    expires: 1,
	                    path: '/'
	                });

				    console.log( 'Retrieved WIPI: ' + data.pid );
	                resolve(data.pid);

				}
				else if ( invocation.readyState == 4 ){
					console.log( 'Wipi not retrieved, returning ----');
					resolve('----');
				}
			};

			invocation.send();

		});

		return promise;

	}

	/*
	 Check session storage and query parameters for any configuration variables.
	 Check the header first, then session storage wo
	 */
	function getAnalyticsConfig()
	{


		var configuration = {};

		//Update default settings from window._analytics
		var _analytics = window._analytics || {};
		Object.keys( _analytics ).forEach( function( key ){
			configuration[key] = configuration[key] || _analytics[key];
		});

		//Add updates from local storage
		Object.keys( configuration ).forEach( function( key ){
			if ( localStorage.getItem(key) !== null ){
				configuration[key] = localStorage.getItem(key);
			}
		});

		//Add updates from the url
	    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	    for(var i = 0; i < hashes.length; i++)
	    {
	        var hash = hashes[i].split('=');
	        var key = hash[0];
	        var value = hash[1];
	        if ( key in configuration ){
	        	configuration[key] = ( value === 'true' || value === true );
	        	//Cache update in session storage to persist it across pages
	        	localStorage.setItem( key, value );
	        }
	    }
	    return configuration;
	}


	/*
	 Vendor provided script to load hotjar
	 */
	function addHotjar(h, o, t, j, a, r) {
		h.hj = h.hj || function() {
			(h.hj.q = h.hj.q || []).push(arguments);
		};

		h._hjSettings = {
			hjid: 61980,
			hjsv: 5
		};

		a = o.getElementsByTagName('head')[0];
		r = o.createElement('script');
		r.async = 1;
		r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
		a.appendChild(r);
	}

	/*
	 Vendor provided script to load Segment
	 */
	 function addSegment(write_key){
		 
	    // Create a queue, but don't obliterate an existing one!
	    var analytics = window.analytics = window.analytics || [];

	    // If the real analytics.js is already on the page return.
	    if (analytics.initialize){
	    	return;
	    }

	    // If the snippet was invoked already show an error.
	    if (analytics.invoked) {
	      if (window.console && console.error) {
	        console.error('Segment snippet included twice.');
	      }
	      return;
	    }

	    // Invoked flag, to make sure the snippet
	    // is never invoked twice.
	    analytics.invoked = true;

	    // A list of the methods in Analytics.js to stub.
	    analytics.methods = [
	      'trackSubmit',
	      'trackClick',
	      'trackLink',
	      'trackForm',
	      'pageview',
	      'identify',
	      'group',
	      'track',
	      'ready',
	      'alias',
	      'page',
	      'once',
	      'off',
	      'on'
	    ];

	    // Define a factory to create stubs. These are placeholders
	    // for methods in Analytics.js so that you never have to wait
	    // for it to load to actually record data. The `method` is
	    // stored as the first argument, so we can replay the data.
	    analytics.factory = function(method){
	      return function(){
	        var args = Array.prototype.slice.call(arguments);
	        args.unshift(method);
	        analytics.push(args);
	        return analytics;
	      };
	    };

	    // For each of our methods, generate a queueing stub.
	    for (var i = 0; i < analytics.methods.length; i++) {
	      var key = analytics.methods[i];
	      analytics[key] = analytics.factory(key);
	    }

	    // Define a method to load Analytics.js from our CDN,
	    // and that will be sure to only ever load it once.
	    analytics.load = function(key){
	      // Create an async script element based on your key.
	      var script = document.createElement('script');
	      script.type = 'text/javascript';
	      script.async = true;
	      script.src = ('https:' === document.location.protocol
	        ? 'https://' : 'http://')
	        + 'cdn.segment.com/analytics.js/v1/'
	        + key + '/analytics.min.js';

	      // Insert our script next to the first script element.
	      var first = document.getElementsByTagName('script')[0];
	      first.parentNode.insertBefore(script, first);
	    };

	    // Add a version to keep track of what's in the wild.
	    analytics.SNIPPET_VERSION = '3.0.1';

	    // Load Analytics.js with your key, which will automatically
	    // load the tools you've enabled for your account. Boosh!
	    analytics.load(write_key);

	    // Make the first page call to load the integrations. If
	    // you'd like to manually name or tag the page, edit or
	    // move this call however you'd like.
	    analytics.page(); //Moved after page loads...

  	}

  	/*
  	 Load coremetrics
  	 */
  	 function addCoremetrics( wipi_promise ){

	    var corementrics_url = '//www.ibm.com/common/stats/ida_production.js';

		var promise = new Promise(function(resolve, reject) {

			/*
			 Bluemix can load Coremetrics asynchronously
			 */
			wipi_promise.then(function(value) {

				_$.async_script(corementrics_url, function() {
					resolve('async');
				});

			});

		});
  	 	return promise;

  	 }

  	function addGoogleAddServices(){

		var client_type = _clientType();
		if ( client_type === 'PhantomJS'){
			return;
		}

	    window.google_conversion_id = 975533992;
	    window.google_custom_params = window.google_tag_params;
	    window.google_remarketing_only = true;

	    _$.async_script('//www.googleadservices.com/pagead/conversion_async.js' );
	}

	function addAddRoll(){

		var client_type = _clientType();
		if ( client_type === 'PhantomJS'){
			return;
		}

		window.adroll_adv_id = '2XK4FFQETRGHTNEHWN6VRC';
	    window.adroll_pix_id = 'VBGSOVJ2QFHXROI6AFOFKH';
	    window.__adroll_loaded=true;

	  	var host = (('https:' === document.location.protocol) ? 'https://s.adroll.com' : 'http://a.adroll.com');
		var url = host + '/j/roundtrip.js';
		_$.async_script( url );
	}

	/*
	  Pull optimizely information from local storage and push it into
	  window.optimizely to configure any running a/b tests.
	  This function must run at the top of the page, before optimizely is loaded.
	 */
	function registerOptimizelyBucketInfo(){

	    window.optimizely = [];

	    //Pull optimizely data from local storage, if possible
	    if ( localStorage.getItem('intercomm_configuration') !== null ){
	        var localData = JSON.parse(localStorage.getItem('intercomm_configuration'));
	        window.optimizely.push(['setUserId', localData.userID]);
	        window.optimizely.push(['bucketVisitor', localData.experimentID, localData.variation]);
	    }

	}




	/**
	 Add page specific event handlers for Coremetrics
	 **/
	function registerCoremetricsEvents(){

		var page_id = getPageID();

		if ( page_id === 'Bluemix Signup'){
			registerSignupCoremetricsEvents();
		}
		cmCreatePageviewTag(page_id, null,null,null,"session-value-_-"+cmJSFGetSessionValue(cm_ClientID));

		pollForHeaderAuthReady().then( function( userID ){
			cmCreateRegistrationTag( userID  );
		});

	}

	function pollForHeaderAuthReady(){

		var promise = new Promise(function(resolve, reject){

			var interval = setInterval(function(){

				if ( getUserID() ){
					clearInterval( interval );
					resolve( getUserID() );
				}
			 }, 500);

		});

		return promise;

	}



	function registerSignupCoremetricsEvents(){

		var client_id = window.cm_ClientID || "";
		cmCreateConversionEventTag(	 'ICE - cloudoev2', '1', 'ICE Trial Sign Up');


		//Fire an event when the user clicks on 'Already have an IBM ID'
		_$.on('.had-ibm-id', 'click', function(){
			cmCreateConversionEventTag('ICE - cloudoe_hasIBMid', '1', 'ICE Trial Sign Up');
		});

		_$.subscribe( 'ConversionEvent', function(e){
			try{
				//Update client id if it's been overwritten by eluminate.js
				if ( client_id.indexOf('BLUEMIX') > -1 ){
					window.cm_ClientID = client_id;
				}
				cmCreateConversionEventTag(e.eventID, e.actionType, e.eventCategoryId );
			}catch(err){}
		});

		_$.on('#register-user', 'click', function(){

			console.log('Conversion event' );

			if ( _$.hasClass( document.body, 'state-bluemix-signup-only' ) ){
				cmCreateConversionEventTag('ICE - cloudoe_hasIBMid', '2', 'ICE Trial Sign Up');
			}
		});

	}

	/*
	  If the user is logged in, but does not have any optimizely information then query the backend for the experiment ID.
	  This function must run at the bottom of the page.
	 */
	function saveOptimizelyInfo(uid){

		if ( localStorage.getItem('intercomm_configuration') !== null ){
	        var localData = JSON.parse(localStorage.getItem('intercomm_configuration'));
	        //Data already exists in memory
	        if ( localData.userID == uid ){
	        	return;
	        }
	    }

	      //Test URL
	      //var url = "/analytics/optimizely/571e84ea-fbee-460f-94a8-e8feb8736582";

	      var url = 'js/optimizely/' + uid;

	      var invocation = new XMLHttpRequest();
	      invocation.open('GET', url, true);
	      invocation.withCredentials = true;

	      invocation.onreadystatechange = function() {

	        if (invocation.readyState == 4 && invocation.status == 200) {

	          	var account_data = JSON.parse( invocation.responseText );

				  if ( account_data === undefined ){
		            console.log('Ill-formed data returned from Optimizely ');
		            return;
		          }

		          if ( account_data.error ){
		            console.log( 'Optimizely a/b test not initialized. REST Query failed for: ' + account_data.reason );
		            return;
		          }

		          if (  account_data.experiment_id === undefined || account_data.variation === undefined ){
		            console.log( 'Optimizely a/b test not initialized. Not all data returned from REST service.' );
		            return;
		          }

		          var optimizely_record = {
		            userID: uid,
		            experimentID: account_data.experiment_id,
		            variation: account_data.variation
		          };

		          var dataToStore = JSON.stringify(optimizely_record);
		          localStorage.setItem('intercomm_configuration', dataToStore);

	        }
	        else if ( invocation.readyState == 4 ){

	            console.log('No data returned from Optimizely ' + invocation.statusText);

	        }
	      };

	      invocation.send();

		}

	/*
	 Restrict NPS to Chrome for now, while we make sure there are no web component library issues.
	 */
	 function allowNPS(){
	 	var allowed_on_atlas = ( ( getSite() == 'BLUEMIX_ATLAS' ) && (getPageID() === 'BLUEMIX OVERVIEW') && ( _clientType() == 'Chrome') );
	 	var allowed_on_classic = (( getSite() == 'BLUEMIX_CLASSIC' ) && getPageID() === 'BLUEMIX DASHBOARD') && ( _clientType() == 'Chrome');
	 	var allowed = ( allowed_on_classic || allowed_on_atlas );
	 	return allowed;
	 }


	 function init(){

	 	var config = window.analytics_config = getAnalyticsConfig();

		//Allow a user to disable analytics for performance tuning.
		if ( config.enabled === false ){
			return;
		}



		//Load Promise polyfill, if necessary
		if ( !window.Promise ){
			_$.sync_script('js/sources/lie.min.js', function(){
				_initAnalytics(config);
			});
		}
		else{
			_initAnalytics(config);
		}

	 }

	/*
	 Entry point for the analytics framework.
	 Walk the page, adding all necessary scripts and event handlers.
	 */
	function _initAnalytics(config){


		//Allow a user to override the local storage logic for segment if they're testing
		config.segment = config.segment || config.force_segment;

		//We always need the wipi, so lets start by grabbing that.
		var wipi_promise = getWipi();

		//Load Optimizely
		if (config.optimizely) {
			registerOptimizelyBucketInfo();
			_$.sync_script('//cdn.optimizely.com/js/' + window._analytics.optimizely_key + '.js');
		}

		//Tealeaf
		if ( config.tealeaf ){
			_$.sync_script('js/tealeaf/tealeaf_jq.js');
			_$.sync_script('js/tealeaf/bluemix_config.js');
		}

		//HotJar
		if ( config.hotjar ){
			addHotjar(window,document,'//static.hotjar.com/c/hotjar-','.js?sv=');
		}


		_$.ready(function(){

			if ( config.coremetrics ){
				var coremetrics_promise = addCoremetrics(wipi_promise);
			}

			//Store page data for later use.
			//This will allow us to dynamically load the segment hooks.
			window.analytics_config.page_info = {
				site: getSite(),
				isBluemix: isBluemix(),
				clientType: _clientType(),
				pageId : getPageID(),
				isAuthenticatedPage: isAuthenticatedPage()
			};


			if ( _clientType() == 'IE' ){
				config.nps = false;
				config.nps_test = false;
			}

			if ( config.segment ){
				addSegment( window._analytics.segment_key );
			}

			if ( config.optimizely ){

				pollForHeaderAuthReady().then( function(uid){
					saveOptimizelyInfo(uid);
				});

			}

			if ( isBluemix() && !isAuthenticatedPage() ){

				//Google add services reserved for non-authenticated pages
			  	if ( config.googleAddServices ){
					addGoogleAddServices();
				}

				//Addroll can only be added when we are not authenticated.
				if ( config.addRoll ){
					addAddRoll();
				}
			}

			//Enable events for specific sites
			var analytics_file = localStorage.getItem('analytics_file');

			//Allow the analytics file to be overloaded for 3rd party clients
			if ( analytics_file !== null ){
				_$.async_script( analytics_file );
			}
			else if ( config.segment && getSite() === 'BLUEMIX_ATLAS' ){
				_$.async_script('js/sources/analytics-atlas.js' );
		    }
			else if ( config.segment && getSite() === 'IOTPLATFORM' ){
				console.log("xxxxxxxxxxxxx SITE = IOTPLATFORM!!!!!");
				_$.async_script('/analytics/js/sources/analytics-atlas.js' );
		    }
		    else if (config.segment && getSite() === 'BLUEMIX_CLASSIC' ) {
				_$.async_script('js/sources/analytics-classic.js' );

		    	// registerSegmentEventsForClassicBluemix( config );
		    }else if ( config.segment ){
		    	_$.async_script('https://console.ng.bluemix.net/analytics/sources/analytics-marketing.js' );
		    }

		    if ( config.coremetrics ){

		    	coremetrics_promise.then( function(){
		    		return pollForCoremetricsReady();
		    	}).then(function(){

			    	//Add campaign and tactic logic. Documented here: http://webdev.bluehost.ibm.com/working/tactic.php
			        _$.async_script("//www.ibm.com/software/info/js/tactic.js");
			        _$.async_script( "//www.ibm.com/software/info/js/tacticbindlinks.js");

		    		registerCoremetricsEvents();
		    	});
		    }

		    if ( config.nps_test && allowNPS() ){

		    	config.nps = false;	//Run in test mode only..

		    	pollForHeaderAuthReady().then(function(uid) {
					var json = {"ibm beta a":{"status":"PENDING","timeStamp":1446142182252},"ibm beta adf":{"status":"PENDING","timeStamp":1446142238086}};
					loadNPS(json, uid);
				});
		    }

			if (config.nps && allowNPS() ) {

				pollForHeaderAuthReady().then(function(uid) {
					var url = 'js/nps/service/pending/' + uid;
					_$.get(url).then(function(json) {
						setTimeout(function(){
							loadNPS(json, uid);
						}, 15000);

					});
				});
			}

		});

	}

	init();


})();
