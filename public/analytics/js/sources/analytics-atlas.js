/*
 Analytics hooks for Atlas - Bluemix

 Precondition: This file should only be loaded by the main bluemix analytics library.
 */

(function() {

	var config = window.analytics_config.page_info;

    if ( !!localStorage.getItem('debug-analytics') ){
        debugger;
    }

	function getUserID(){

		var user;
		if ( window.header && window.header.accountStatus && window.header.accountStatus.userGuid ){
			user =  window.header.accountStatus.userGuid;
		}
		return user;
	}

    function getPageID(){
        var pageID = "BLUEMIX OTHER";
        try{
            pageID = window.analytics_config.page_info.pageId;
        }catch(err){
            try{
              pageID =   digitalData.page.pageInfo.pageID;
          }catch(err){};
        }

        var hash = window.location.hash;

        if ( pageID === 'BLUEMIX DASHBOARD' && document.querySelector('.isShowing_pricingSheet') ){
            pageID = "BLUEMIX PRICING";
        }else if ( window.digitalData &&  window.digitalData.isCatalogDetailsPage ){
            pageID = "BLUEMIX CATALOG DETAILS";
        }else if ( window.digitalData && window.digitalData.page && digitalData.page.isCatalogDetailsPage ){
            pageID = "BLUEMIX CATALOG DETAILS";
        }


        else if (hash && hash.indexOf('userAccount') > -1 ){
            pageID =  'Account Management';
        }

        return pageID;

    }

	// Get the user's current region - e.g. US South
    function getRegion() {
    	var region = 'unknown';
    	try{
    		region = document.querySelector('.current-region').getAttribute('data-name');
    	}
    	catch(err){}
    	return region;
    }

    //Get a name for the subject of the current page - e.g. "Liberty for Java"
    function getName(category) {

        if ( category === 'Home'){
            var page_info = window.analytics_config.page_info;
            if ( page_info.isAuthenticatedPage ){
                return 'Authenticated';
            }else{
                return 'Unauthenticated';
            }

        }
        else if ( category == 'Documentation'){
            return _$.text('title');
        }


        var name;
		if (_$.text(".app-name")) {
			name = _$.text(".app-name");
		}
		if (_$.text(".serviceName")) {
			name = _$.text(".serviceName");
		}
		if (_$.text(".info-title")) {
			name = _$.text(".info-title");
		}

		if (!name) name = getSubCategory();
        return name;
    }

    // Get a subcategory for the current page - e.g. "Compute"
    function getSubCategory() {

    	//Handle account management seperately, incorrectly tagged + dojo code.
    	if ( getCategory() == 'Account Management' ){

    		var query_params = getQueryParameters();
    		var selected_nav = query_params['/userAccount/selected_nav'];

			if ( selected_nav == 'nav_support'){
				return 'Support';
			}else if ( selected_nav == 'nav_usage'){
				return 'Usage';
			}else if ( selected_nav == 'nav_account'){
				return 'Account Details';
			}
			else if ( selected_nav == 'nav_notifications'){
				return 'Notifications';
    		}
    		else{
    			return 'Unknown Section';
    		}

    	}

        return _$.text(".current-taxonomy");
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

	function getQueryParameters() {
		var result = {};
		var location = window.location.href.replace('#', '&' );
	    var hashes = location.slice(location.indexOf('?') + 1).split('&');
	    for(var i = 0; i < hashes.length; i++)
	    {
	        var hash = hashes[i].split('=');
	        var key = hash[0];
	        var value = hash[1];
	        result[key] = value;
	    }
	    return result;
	}

	//Return the page category (a name for a group of related pages)
    function getCategory() {

        var page_info = window.analytics_config.page_info;
    	var pageID = page_info.pageId || 'BLUEMIX PAGE (OTHER)';
    	var hash = window.location.hash;

    	if ( pageID == 'IBMBLUEMIX'){
    		return 'Home';
    	}
    	else if (hash && hash.indexOf('userAccount') > -1 ){
    		return 'Account Management';
    	}
    	else if ( pageID && pageID.indexOf('BLUEMIX CATALOG') > -1 ){
    		return 'Catalog';
    	}
    	else if ( pageID == 'BLUEMIX OVERVIEW'){
    		return 'Dashboard';
    	}
        else if ( pageID === 'BLUEMIX APP DETAILS'){
        	return "Component Details";
        }
        else if ( pageID === 'BLUEMIX SERVICE DETAILS' ){
        	return "Component Details";
        }else if ( pageID === 'BLUEMIX DOCS'){
            return "Documentation";
        }
        else {
            return pageID;
        }
    }

    //Generate page tag
	function atlasPageView(){

		// Figure out the name, category, etc. for a segment "page" call
        var category = getCategory();
        var name =  category + ' - ' +  getName(category);

        var properties = {
        	region: getRegion(),
        	ui_version : 'new',
        	wipi : _$.getCookie('BLUISS') || '---',
            authenticated: window.analytics_config.page_info.isAuthenticatedPage
        };

        properties = addTimingData(properties);

        if (category=="Catalog") {
            var query_params = getQueryParameters();
            if (query_params.category ){
                name = query_params.category ;
            }
            var search = query_params.search;

            if (search) properties.search = search;
        }

        if (category=="Component Details" || category=="Dashboard") {
            properties.subCategory = getSubCategory();
        }

        if (window.digitalData.isCatalogDetailsPage) {
            properties.name = window.digitalData.detailsName;
            properties.category = window.digitalData.detailsType;
            category = "Catalog Details";
            name = "Catalog Details - "+properties.name;
        }

   		var intercomm_enabled = !!localStorage.getItem('intercomm_configuration');
        var options = {

            integrations: {
                'All': true,
                'Intercom': ( intercomm_enabled === true )
            }
        };

        console.log( 'Segment: ' + category + ' - ' + name );
		analytics.page(category, name, properties, options);

		//Identify authorized users.
        pollForHeaderAuthReady().then(function(uid) {
            analytics.identify(uid, {
                ui_version: 'new'
            }, {
                integrations: {
                    'All': true,
                    'Intercom': intercomm_enabled
                }
            });
        });
	}

    function addTimingData(properties) {

        try {

            var timing = window.performance && window.performance.timing;
            var navigation = window.performance && window.performance.navigation;
            if (timing) {
                properties.unload = timing.unloadEventEnd - timing.unloadEventStart;
                properties.redirect = timing.redirectEnd - timing.redirectStart;
                properties.dns = timing.domainLookupEnd - timing.domainLookupStart;
                properties.tcp = timing.connectEnd - timing.connectStart;
                properties.ssl = timing.secureConnectionStart && (timing.connectEnd - timing.secureConnectionStart);

                properties.ttfb = timing.responseStart - timing.navigationStart;
                properties.domInteractive = timing.domInteractive - timing.navigationStart;
                properties.domComplete = timing.domComplete - timing.navigationStart;
                properties.pageLoadTime = timing.loadEventEnd - timing.navigationStart;

                properties.basePage = timing.responseEnd - timing.responseStart;
                properties.frontEnd = timing.loadEventStart - timing.responseEnd;
            }

            if (navigation) {
                properties.redirectCount = navigation.redirectCount;
                properties.navigationType = navigation.type;
            }
        } catch (err) {}

        return properties;
    }


	/*
	 Fire segment events when the user interacts with the support widget
	 */
	function addSupportHooks(){

		//Someone uses the support widget to search the docs
		_$.on('.btn-post-question', 'click', function(){
			var search = document.querySelector('input.help-search').value;
			trackEvent('Searched Docs and Stack Overflow', { Search: search });
		});

		//Someone submits a support ticket
		_$.on('.ticket-submit-container .submit-button', 'click', function(){
			trackEvent('Submit support ticket' );
		});


	}

	function addCommonTags(){

        //Listen for authentication and org/space data loaded.
        // header.whenOrgReady(function(){

        // });

        //Do we load intercomm?
        var intercomm_enabled = !!localStorage.getItem('intercomm_configuration');

        pollForHeaderAuthReady().then(function(uid) {
            analytics.identify(uid, {
                ui_version: 'new'
            }, {
                integrations: {
                    'All': true,
                    'Intercom': intercomm_enabled
                }
            });
        });

		//Watch when the user switches to the old version of Bluemix
		_$.on('.bluemix-nav-list-link.parallel-release', 'click', function(){
			trackEvent('Switch to Bluemix Classic' );
		});
	}

	function addHomeTags(){

        var category = "Home";
        var name = category + ' - ' + (config.isAuthenticatedPage ? "Authenticated" : "Unauthenticated");
        var properties =getPageProperties();
        var options = getPageOptions();

        pageEvent(category, name, properties, options);


	}

    function addDashboardTags(){
        var category = "Dashboard";
        var subCategory = _$.text(".current-taxonomy");
        var name = category + ' - ' +  subCategory;
        var properties =getPageProperties();
        var options = getPageOptions();
        pageEvent(category, name, properties, options);
    }

    function getDashboardSubCategory(){

    }

    function addServiceDetailsTags(){

        var category = "Component Details";
        var subCategory = " - Service Details";
        var component = " - " + _$.text('.serviceName');
        var properties =getPageProperties();
        var options = getPageOptions();
        pageEvent(category, category + subCategory + component, properties, options);


        //Switch tabs
        _$.on('.nav__item', 'click', function(evt){
            var target = evt.currentTarget.getAttribute('paneid');
            if ( target ){
                trackEvent('Select tab', { paneid: target} );
            }
        });

        //Click on create connection
        _$.on( '.connectButton', 'click', function(){
            trackEvent('Create Connection clicked', {} );
        });

        //Unbind application (click on menu item)
        _$.on('button.unbindApp', 'click', function(){
            trackEvent('Unbind Connection', {} );
        });
    }

    function addCatalogTags(){

        var category = "Catalog";
        var name = category + ' - Overview';
        var properties =getPageProperties();
        var options = getPageOptions();
        pageEvent(category, name, properties, options);

    }

    function addCatalogDetailsTags( config ){
        var category = "Catalog Details";
        var name = digitalData.page.pageInfo.pageID.replace('BLUEMIX CATALOG', 'Catalog Details');
        var properties =getPageProperties();
        var options = getPageOptions();
        pageEvent(category, name, properties, options);
    }

    function addAppDetailTags(){

        var category = "Component Details";
        var subCategory = " - App Details";
        var component = " - " + _$.text('.app-name');
        var properties =getPageProperties();
        var options = getPageOptions();
        pageEvent(category, category + subCategory + component, properties, options);
    }

    function addDocTags(){

        var category = "Documentation";

        var context_root = "Documentation";
        var subCategory = "Overview";
        try{
            var paths = window.location.pathname.split('/');
            paths = paths.filter(function(path){
                return ( path.length > 0 );
            });
            context_root = paths.shift();
            sub_root = paths.shift();
            subCategory = sub_root || subCategory;
        }catch(err){}

        var name = category + ' - ' + subCategory;
        var properties =getPageProperties();
        var options = getPageOptions();

        pageEvent(category, name, properties, options);

    }


    function addPricingTags(){

        var category = "Pricing";
        var name = category + getPricingSubCategory();
        var properties =getPageProperties();
        var options = getPageOptions();
        pageEvent(category, name, properties, options);

        //User clicks on pricing calculator
        _$.on('.detailed-calculator-section a', 'click', function(){
            trackEvent('Viewed Pricing Calculator');
        });
    }

    function getPricingSubCategory(){
        var subCategory = "";
        if ( document.querySelector('.isShowing_pricingSheet') ){
            subCategory = " - Calculator";
        }else{
            subCategory = " - Overview";
        }

        return subCategory;
    }

    function addAccountManagementTags(){

        var category = "Account Management";
        var name = category + ' - Overview';
        var properties =getPageProperties();
        var options = getPageOptions();

        pageEvent(category, name, properties, options);

    }

    function addSignupTags(){

        var category = "Registration";
        var name = category + ' - ' + window.digitalData.page.subCategory;
        var properties =getPageProperties();
        var options = getPageOptions();

        pageEvent(category, name, properties, options);

    }

    function addIotDashboardTags(){
        var category = "Dashboard";
        var name = category + ' - ' + 'Watson IoT';
        var properties =getPageProperties();
        var options = getPageOptions();

        pageEvent(category, name, properties, options);
    }

		function addIotPlatformTags(){
			var category = "IoT Platform";
			var name = category;
			var properties =getPageProperties();
			var options = getPageOptions();

			pageEvent(category, name, properties, options);
		}

		function addIotElectronicsTags(){
			var category = "IoT";
			var name = "Electronics";
			var properties =getPageProperties();
			var options = getPageOptions();

			pageEvent(category, name, properties, options);
		}
    /*
     Options common to all page events
     */
    function getPageOptions(){
        var intercomm_enabled = !!localStorage.getItem('intercomm_configuration');
        var options = {
            integrations: {
                'All': true,
                'Intercom': ( intercomm_enabled === true )
            }
        };
        return options;
    }

    /*
     Properties common to all page events
     */
    function getPageProperties(){
        var properties = {
            region: getRegion(),
            ui_version : 'new',
            wipi : _$.getCookie('BLUISS') || '---',
            authenticated: window.analytics_config.page_info.isAuthenticatedPage
        };

        properties = addTimingData(properties);

        return properties;
    }

    function pageEvent(category, name, properties, options){
        console.log( 'Page Event: ' + category + ", " + name);
        analytics.page(category, name, properties, options);
    }

    function trackEvent(title, properties){
        console.log( 'Track Event: ' + title);
        analytics.track(title, properties);
    }

    var page_id = getPageID();

    if ( page_id == 'BLUEMIX DOCS'){
    	addDocTags();
    }else if ( page_id == 'IBMBLUEMIX' ){
    	addHomeTags();
    }
    else if (page_id == 'BLUEMIX OVERVIEW'){
    	addDashboardTags();
    }
    else if ( page_id == 'BLUEMIX CATALOG'){
    	addCatalogTags();

        //Fire a new page view event when the query parameter changes
        _$.on('div.filter-item', 'click', function(evt){
                addCatalogTags();
        });

    }else if ( page_id == 'BLUEMIX CATALOG DETAILS'){
        addCatalogDetailsTags( config );
    }
    else if ( page_id == 'BLUEMIX PRICING' ){
    	addPricingTags();
    }
    else if ( page_id == 'BLUEMIX SERVICE DETAILS'){
    	addServiceDetailsTags();
    }
    else if ( page_id == 'BLUEMIX APP DETAILS'){
    	addAppDetailTags();
    }
    else if ( page_id == 'Account Management' ){
    	addAccountManagementTags();

        //Tab changed, fire off a new page view event
        window.addEventListener("hashchange", function(){
            addAccountManagementTags();
        }, false);
    }else if ( page_id == 'Bluemix Signup'){
        addSignupTags();
    }
    else if (page_id === 'BLUEMIX IOT'){
        addIotDashboardTags();
    }
	else if (page_id === 'IOTPLATFORM DASHBOARD'){
        addIotPlatformTags();
    }
	else if (page_id === 'IOTELECTRONICS'){
		console.log('Inside If');
        addIotElectronicsTags();
		console.log('Going out If');
    }

    addCommonTags();
    addSupportHooks();


})();
