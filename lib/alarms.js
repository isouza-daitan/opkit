/**@namespace Alarms	*/

var AWS = require('aws-promised');
var Promise = require('bluebird');
var _ = require('lodash');
function Alarms(){
}

/**
 * Retrive all CloudWatch Alarms.
 * Returns a Promise containing a JS object with all configured alarms.
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Object} params - Additional AWS Filters.
 * @param {Array} ignore - Optional list of names of alarms to ignore.
 */
Alarms.prototype.getAllAlarms = function(auth, params, ignore, prevResults){
	var self = this;
	params = params || {};
	var cloudwatch = new AWS.cloudWatch(auth.props);
	return cloudwatch.describeAlarmsPromised(params)
	.then(function(data) {
		if (prevResults) {
			data.MetricAlarms = data.MetricAlarms.concat(prevResults.MetricAlarms);
		}
		if (data.NextToken) {
			params.NextToken = data.NextToken;
			return self.getAllAlarms(auth, params, ignore, data);
		} else {
			if (ignore) {
				var nonIgnoredAlarms = [];
				for (var alarmIdx = 0; alarmIdx < data.MetricAlarms.length; alarmIdx++) {
					if(!(_.includes(ignore, data.MetricAlarms[alarmIdx].AlarmName))) {
						nonIgnoredAlarms.push(data.MetricAlarms[alarmIdx]);
					}
				}
				data.MetricAlarms = nonIgnoredAlarms;
			}
			return Promise.resolve(data);
		}
	});
};
/**
 * Queries Cloudwatch alarms that are currently in a particular state.
 * Returns a Promise containing a JS object with all of the alarms currently in that state.
 * @param {string} state - A string containing the state you'd like to query for (e.g. 'ALARM')
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Array} ignore - Optional list of names of alarms to ignore.
 */

Alarms.prototype.queryAlarmsByState = function(state, auth, ignore){
	return this.getAllAlarms(auth, {StateValue : state}, ignore);
};
/**
 * Queries Cloudwatch alarms that are currently in a particular state.
 * Returns a Promise that resolves to a string containing information about each alarm in the queried state.
 * @param {string} state - A string containing the state you'd like to query for (e.g. 'ALARM')
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Array} ignore - Optional list of names of alarms to ignore.
 */

Alarms.prototype.queryAlarmsByStateReadably = function(state, auth, ignore){
	return this.queryAlarmsByState(state, auth, ignore)
	.then(function(data){
		var returnMe = '';
		var alarms = data.MetricAlarms;
		for (var k=0; k<alarms.length; k++){
			returnMe += '*'+alarms[k].StateValue +'*: ' + 
			alarms[k].AlarmName + "\n";
		}
		return Promise.resolve(returnMe);
	});
};

/**
 * Queries Cloudwatch alarms that are currently in a particular state.
 * Returns a Promise containing the number of alarms in the state.
 * @param {string} state - A string containing the state you'd like to query for (e.g. 'ALARM')
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Array} ignore - Optional list of names of alarms to ignore.
 */
Alarms.prototype.countAlarmsByState = function(state, auth, ignore){
	return this.queryAlarmsByState(state, auth, ignore)
	.then(function(data){
		return Promise.resolve(data.MetricAlarms.length);
	});
};

/**
 * Queries Cloudwatch alarms.
 * Returns a Promise containing a string with a health report, detailing the number of alarms in each state.
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Object} params - Additional AWS Filters.
 * @param {Array} ignore - Optional list of names of alarms to ignore.
 */

Alarms.prototype.healthReportByState = function(auth, params, ignore){
	return this.getAllAlarms(auth, params, ignore)	
	.then(function(data){
		var alarms = data.MetricAlarms;
		var numOK=0, numInsufficient=0, numAlarm=0;
		for (var k=0; k<alarms.length; k++){
			if (alarms[k].StateValue === 'ALARM'){
				numAlarm++;
			}
			else if (alarms[k].StateValue === 'OK'){
				numOK++;
			}
			else{
				numInsufficient++;
			}
		}
		return Promise.resolve("*Number Of Alarms, By State:* \n"+
			"OK: *"+numOK+"*\n"+
			"Alarm: *"+numAlarm+ "*\n"+
			"Insufficient Data: *"+numInsufficient+"*");
	});
};

/**
 * Queries Cloudwatch alarms that have particular names.
 * Returns a Promise containing a JS object with all of the alarms that have one of the names on the watchlist.
 * @param {Array} watchlist - An array containing the names of alarms you'd like to query for.
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Array} ignore - Optional list of names of alarms to ignore.
 */
Alarms.prototype.queryAlarmsByWatchlist = function(watchlist, auth, ignore){
	return this.getAllAlarms(auth, {AlarmNames: watchlist}, ignore);
};

/**
 * Queries Cloudwatch alarms that have particular names.
 * Returns a promise resolving to a string containing information about all matching alarms.
 * @param {Array} watchlist - An array containing the names of alarms you'd like to query for.
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Array} ignore - Optional list of names of alarms to ignore.
 */
Alarms.prototype.queryAlarmsByWatchlistReadably = function(watchlist, auth, ignore){
	return this.queryAlarmsByWatchlist(watchlist, auth, ignore)
	.then(function(data){
		var returnMe = '';
		var alarms = data.MetricAlarms ;
		for (var k=0; k<alarms.length; k++){
			returnMe += '*'+alarms[k].StateValue +'*: ' + 
			alarms[k].AlarmName + "\n";
		}
		return Promise.resolve(returnMe);
	});
};

/**
 * Queries Cloudwatch alarms that have names that start with the prefix string.
 * Returns a Promise containing a JS object with all of the alarms that have names that begin with the prefix.
 * @param {string} prefix - A prefix string. All alarms with names that begin with the prefix will be returned.
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Array} ignore - Optional list of names of alarms to ignore.
 */

Alarms.prototype.queryAlarmsByPrefix = function(prefix, auth, ignore){
	return this.getAllAlarms(auth, {AlarmNamePrefix: prefix}, ignore);
};

/**
 * Queries Cloudwatch alarms that have names that start with the prefix string.
 * Returns a String containing information about all of the alarms that have names that begin with the prefix.
 * @param {string} prefix - A prefix string. All alarms with names that begin with the prefix will be returned.
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Array} ignore - Optional list of names of alarms to ignore.
 */

Alarms.prototype.queryAlarmsByPrefixReadably = function(prefix, auth, ignore){
	return this.queryAlarmsByPrefix(prefix, auth, ignore)
	.then(function(data){
		var returnMe = '';
		var alarms = data.MetricAlarms ;
		for (var k=0; k<alarms.length; k++){
			returnMe += '*'+alarms[k].StateValue +'*: ' + 
			alarms[k].AlarmName + "\n";
		}
		return Promise.resolve(returnMe);
	});
};

/**
 * Get usage statistics for a cloudwatch alarm over a specified interval.
 * Returns an Array of Objects - each object contains metric statistics about the given execution.
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Object} params - AWS query params.
 * @param {Number} interval - Number of ms inbetween queries (Example: for one day
 * it would be 1000 * 60 * 60 * 24)
 * @param {Number} numOfExecutions - How many intervals should be executed (Example: 1 week =
 * 7 executions)
 * Suggested: params.Period = 60, interval = 1000 * 60 * 60 * 24, numOfExecution = num of days
 */
Alarms.prototype.getMetricStatistics = function(auth, params, interval, numOfExecutions){
	var promises = [];
	var now = new Date();
	var cloudwatch = new AWS.cloudWatch(auth.props);
	for (var i=0; i<numOfExecutions; i++) {
		var endTime = new Date(now - i * interval);
		params.EndTime = endTime.toISOString();
		params.StartTime = new Date(endTime - interval).toISOString();
		promises.push(cloudwatch.getMetricStatisticsPromised(params));
	}
	return Promise.all(promises);
};


/**
 * Performs a single AWS CloudWatch metric query. 
 * @param {Auth} auth - An auth object made using the keys and region you'd like to use.
 * @param {Object} params - AWS query params.
 */
Alarms.prototype.getMetricStatisticsSingle = function(auth, params){
	var cloudwatch = new AWS.cloudWatch(auth.props);
	return cloudwatch.getMetricStatisticsPromised(params);
};

module.exports = Alarms;
