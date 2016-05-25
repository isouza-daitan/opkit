var CLIENT_EVENTS = require('slack-client').CLIENT_EVENTS;
var RTM_EVENTS = require('slack-client').RTM_EVENTS;
var RTM_CLIENT_EVENTS = require('slack-client').CLIENT_EVENTS.RTM;
var RtmClient = require('slack-client').RtmClient;
var MemoryDataStore = require('slack-client').MemoryDataStore;
var Auth = require('./auth');

/**
 * Constructor for an Opkit Bot.
 * @param {string} name: the word to 'listen' for. First word of commands
 * @param {Object} commands: each key is a word to listen for; each value is a function
 * taking parameters message and bot.
 * @param {Object} state: to hold internal variables for the bot. 
 * @param {Opkit} opkit: should be `this`
 */

function OpkitBot(name, commands, state, opkit) {
	this.name = name;
	this.commands = commands;
	if (!this.commands.userHasAuthorizationTo){
		this.commands.userHasAuthorizationTo = function(user, command, callback){
			if (process.env.amazonId && process.env.amazonSecret && process.env.amazonRegion){
				var auth = new Auth(process.env.amazonId, process.env.amazonSecret, process.env.amazonRegion);
				callback(auth);
			} else {
				callback(true);
			}
		};
	}
	this.state = state;
	this.opkit = opkit;
	var self = this;
	var dataStore = new MemoryDataStore();
	this.rtm = new RtmClient(process.env.token, {dataStore : dataStore, logLevel : 'debug'});
	this.start = function(){
		self.rtm.start();
	};

	this.sendMessage = function(reply, channel){
		self.rtm.sendMessage(reply, channel);
	};

	this.onEventsMessage = function(message){
		var message_split = message.text.split(' ');
		if (message_split[0]===self.name){
			if (self.commands.hasOwnProperty(message_split[1])){
				var auth = self.commands.userHasAuthorizationTo(
					message.user, message_split[1], function(auth){
					if (auth){
						self.commands[message_split[1]](message, self, auth);
					} else {
						self.sendMessage("Access denied.", message.channel);
					}
				});
			}
		} 
	};	

	this.rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED);
	this.rtm.on(RTM_EVENTS.MESSAGE, this.onEventsMessage);

}

module.exports = OpkitBot;