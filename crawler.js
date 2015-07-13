var Crawler = function(){
	this.usernames = {}
	this.data_tag = "gitname-extension-loaded";

	this.crawl = function() {
		var $this = this,
			user_element,
			linkList;
		
		linkList = $('a').filter(function(){
			return !$(this).data($this.data_tag);
		});

		for (var i = 0; i < linkList.length; i++){
			userElement = linkList[i];
			
			if($this.isUser(userElement)){
				$this.loadNames(userElement);
			}
		}
	};

	this.getName = function(userid) {
		var $this = this,
			now = Date.now(),
			result = false;

		if ($this.usernames.hasOwnProperty(userid)) {
			result = $this.usernames[userid];
		}
		else if (chrome.storage) {
			// Only grab from chrome storage on first load
			chrome.storage.local.get(
				userid,
				function(items){
					stored_result = items[userid];
					if (!stored_result) {
						$this.usernames[userid].loading = false;
					} else {
						stored_result.loading = false;
						stored_result.loaded = true;
						$this.usernames[userid] = stored_result;
					}
			});
			result = {
				'name': userid,
				'loading': true,
				'loaded': false
			};
		}

		if (result.expiration && result.expiration < now) {
			result.loaded = false;
		}
		return result;
	};

	this.saveName = function(userid, doc) {
		var $this = this,
			storage_object = {};

		$this.usernames[userid] = doc;
		storage_object[userid] = doc;
		if (chrome.storage) {
			chrome.storage.local.set(storage_object);
		}
	};

	this.unsetName = function(userid) {
		delete this.usernames[userid];
		if (chrome.storage) {
			chrome.storage.local.remove(userid);
		}
	};

	this.extendExpiration = function(userid, doc, seconds) {
		var $this = this,
			now = Date.now();

		if (!doc.expiration) {
			doc.expiration = now;
		}
		doc.expiration += num * 1000;
		$this.saveName(userid, doc);
	}

	this.parseAuthor = function(uri) {
		var $this = this,
	        tmp = [],
	        result, q;
	    
	    uri
	    	.substr(uri.indexOf("?") + 1)
	        .split("&")
	        .forEach(function (item) {
	        tmp = item.split("=");
	        if (tmp[0] === "author") result = decodeURIComponent(tmp[1]);
	        else if(tmp[0] === "q") q = decodeURIComponent(tmp[1]);
	    });
	    if (!result && q) {
	    	q
	    		.split("+")
	    		.forEach(function (item) {
	    			tmp = item.split(":");
	    			if (tmp[0] === "author") {
	    				result = tmp[1].replace("#","");
	    			}
	    	});
	    }
	    return result;
	};

	this.isUser = function(linkElement) {
		var $this = this,
			userID = linkElement.innerHTML,
			elementLink = linkElement.href;

		if(userID.match(/</)) return false;

		if(userID.match(/@/)){
			userID = userID.substr(1);
		}
		
		if (linkElement.rel == "author" || linkElement.rel == "contributor")
			return true;
		
		if (typeof elementLink == "string" && elementLink.match(new RegExp("author.*" + userID.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')))) {
			return true;
		}
			
		if (elementLink == "/" + userID || elementLink == "https://github.com/" + userID)
			return true;

		return false;
	},

	this.loadNames = function(userElement) {
		var $this = this,
			elementHTML = userElement.innerHTML,
			elementLink = userElement.href,
			elementFront = "",
			name_lookup, ajax_params, real_name, hasTags;
		
		// Strip whitespace
		elementHTML = elementHTML.replace(/\s/g, "");
				
		if (elementHTML.match(/@/)) {
			// For mentions in comments e.g. @userid
			hasTags = true;
			elementFront = "@";
			elementHTML = elementHTML.substr(1);
		}

		if (!elementHTML && !(elementHTML = $this.parseAuthor(elementLink))) {
			return;
		}
		
		if (elementHTML.indexOf("/") >= 0) {
			elementHTML = elementHTML.substr(0, elementHTML.indexOf("/"));
		}

		name_lookup = $this.getName(elementHTML);
		if (!name_lookup) {
			name_lookup = {
				'name': elementHTML,
				'loaded': false,
				'loading': false
			}
		}

		if (!name_lookup.loading && !name_lookup.loaded) {
			name_lookup.loading = true;
			$this.saveName(name_lookup);
			
			ajax_params = {
				dataType: "json",
				url: "https://api.github.com/users/" + elementHTML,
				data: null,
				success: function(json, statusText, jqXHR){
					var now = Date.now();
					if (jqXHR.status == 304) {
						$this.extendExpiration(elementHTML, 1800);
					}
					else if (json && json.name != undefined && json.name) {
						name_lookup.name = json.name;
						name_lookup.loading = false;
						name_lookup.loaded = true;
						var last_modified = jqXHR.getResponseHeader("Last-Modified");
						if (last_modified) {
							name_lookup.last_modified = last_modified;
						}
						name_lookup.expiration = now + (1800 * 1000);
						$this.saveName(elementHTML, name_lookup);
						userElement.innerHTML = name_lookup.name;	
					}
				},
				complete: function(jqXHR){
					var now = Date.now();
					if (jqXHR.status == 404) {
						name_lookup.name = elementHTML;
						name_lookup.expiration = now + (3600 * 24 * 2 * 1000);
					} else {
						name_lookup.expiration = now + (1800 * 1000);
					}
					name_lookup.loading = false;
					name_lookup.loaded = true;
					$this.saveName(elementHTML, name_lookup);
					$(userElement).data($this.data_tag, true);
				}
			}

			if (name_lookup.last_modified) {
				ajax_params['headers'] = {"If-Modified-Since" : name_lookup.last_modified};
			}

			$.ajax(ajax_params);
		}

		real_name = name_lookup.name;
		if (hasTags) {
			real_name = elementFront + real_name;
		}
		userElement.innerHTML = real_name;
		if (name_lookup.loaded) {
			$(userElement).data($this.data_tag, true);
		}
	};
}

var crawly = new Crawler();
setInterval(function(){
	crawly.crawl();}, 500
);
crawly.crawl();