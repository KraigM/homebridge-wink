# homebridge-wink
[Homebridge](https://github.com/nfarina/homebridge) platform plugin for the Wink hub

This repository contains the Wink plugin for homebridge that was previously bundled in the main `homebridge` repository.

# Installation


1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-wink
3. Update your configuration file. See sample-config.json snippet below. 

# Configuration

Configuration sample:

 ```
"platforms": [
		{
			"platform": "Wink",
			"name": "Wink",
			"client_id": "YOUR_WINK_API_CLIENT_ID",
			"client_secret": "YOUR_WINK_API_CLIENT_SECRET",
			"username": "your@email.com",
			"password": "WINK_PASSWORD"
		}
	],

```

Fields: 

* "platform": Must always be "Wink" (required)
* "name": Can be anything (required)
* "client_id": Wink API client id, must be obtained from questions@wink.com (required)
* "client_secret": Wink API client id, must be obtained from questions@wink.com (required)
* "username": Wink login username, same as app (required)
* "password": Wink login password, same as app (required)

