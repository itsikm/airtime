'use strict';

var request = require('request');
var util = require('util');
var async = require('async');

var roomsBroken = [];
var challengeCode = [];

/**
 * Create new API request
 * @param {string} url - labyrinth api url
 * @param {function} callback
 */
function createRequest(url, callback) {
    request.get({
        url: 'http://challenge2.airtime.com:7182' + url,
        headers: {
            'X-Labyrinth-Email': 'itsik@airtime-challenge.com'
        },
        json: true
    }, callback);
}

function createPostRequest(url, postData, callback) {
    request.post({
        url: 'http://challenge2.airtime.com:7182' + url,
        body: postData,
        headers: {
            'X-Labyrinth-Email': 'itsik@airtime-challenge.com'
        },
        json: true
    }, callback);
}

/**
 * Start checking the labyrinth and post the results
 */
createRequest('/start', function(error, response, body){
    nextRoom(body.roomId, function(){
        var reportData = {
            roomIds: roomsBroken,
            challenge: getChallengeCode()
        };
        createPostRequest('/report', reportData, function(err, httpResponse, body){
            if(err) console.error('error:', err);
            else {
                console.log('Report Sent! Mothership responded with:', body);
            }
        });
    });
});

/**
 * Parse the Challenge code to a string
 * @returns {string}
 */
function getChallengeCode() {
    var code = [];
    challengeCode.sort(orderChallengeCode);
    for(var i in challengeCode) {
        var writing = challengeCode[i].writing;
        if(writing) {
            code.push(writing);
        }
    }
    return code.join('');
}

/**
 * Order Challenge code by order number
 * @param {object} a - prev item
 * @param {object} b - current item
 * @returns {number} - where to move the current item
 */
function orderChallengeCode(a, b) {
    if (a.order < b.order)
        return -1;
    if (a.order > b.order)
        return 1;
    return 0;
}

/**
 * Explorer the next room on recursive way
 * @param {string} roomId - room ID
 * @param {function} callback
 */
function nextRoom(roomId, callback) {
    // Check if lights are working in this room
    checkThisRoom(roomId, function(){

        // when the light check is complete, look around
        // and search new rooms to explorer
        lookAround(roomId, function(rooms){
            async.each(rooms, function(room, cb){
                nextRoom(room, function(){
                    cb();
                });
            }, function(){
                callback();
            });
        });
    });
}

/**
 * Look around for new rooms to explorer
 * @param {string} roomId - room ID
 * @param {function} callback
 */
function lookAround(roomId, callback) {
    createRequest(util.format('/exits?roomId=%s', roomId), function(error, response, body){
        var rooms = [];
        if(body.exits) {
            async.each(body.exits, function(exit, callback){
                createRequest(util.format('/move?roomId=%s&exit=%s', roomId, exit), function(error, response, body){
                    rooms.push(body.roomId);
                    callback();
                });
            }, function(){
                callback(rooms);
            });
        }
        else callback(rooms);
    });
}

/**
 * Check if the light working on this room
 * @param {string} roomId - room ID
 * @param {function} callback
 */
function checkThisRoom(roomId, callback) {
    createRequest(util.format('/wall?roomId=%s', roomId), function(error, response, body){
        if(body.writing === 'xx' && body.order === -1) {
            roomsBroken.push(roomId);
        }
        else {
            challengeCode.push(body);
        }
        callback();
    });
}
