/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

require('dotenv').config({ silent: true });

var express = require('express');  // app server
var bodyParser = require('body-parser');  // parser for post requests
var watson = require('watson-developer-cloud');  // watson sdk

var path = require('path');
global.appRoot = path.resolve(__dirname);

//Use a querystring parser to encode output.
var qs = require('qs');
var rq = require('request');
var fs = require('fs');
var util = require('util');

var multer = require('multer')
var upload = multer({ dest: './temp/audioRec/' })

// The following requires are needed for logging purposes
var uuid = require('uuid');
var vcapServices = require('vcap_services');
var basicAuth = require('basic-auth-connect');

//Create the service wrapper for T2S

var text_to_speech = watson.text_to_speech({
	url: "https://stream.watsonplatform.net/text-to-speech/api",
	username: process.env.T2S_username || '8510ac3e-8159-45ce-9cdc-9343d69cce82',
	password: process.env.T2S_password || '1HYxb5G6V2nM',
	version: 'v1'
});


//Create the service wrapper for S2T
var speech_to_text = watson.speech_to_text({
	url: "https://stream.watsonplatform.net/speech-to-text/api",
	username: process.env.S2T_username || '5cbc16ea-ff55-4505-bd0a-802a390d9fba' ,
	password: process.env.S2T_password || 'wjjiNeNEahny',
	version: 'v1'
});


var language_translator = watson.language_translator({
	url: 'https://gateway.watsonplatform.net/language-translator/api',
	username: process.env.Translator_username || '54007be5-4ea0-4300-8f31-9651460db277',
	password: process.env.Translator_password || 'MAQXO4Hv6tQx',
	version: 'v2'
});


if (process.env.VCAP_SERVICES) {
//Create the service wrapper for Conversation
    var conversation = watson.conversation({
        url: "https://gateway.watsonplatform.net/conversation/api",
        username: process.env.Conversation_username || '6a66ea6b-9988-4a21-8977-bc8c0f6ec761',
        password: process.env.Conversation_password || 'ntoHJXQAIJEr',
        version_date: '2016-09-20',
        version: 'v1'
    });
} else {
    //Create the service wrapper for Conversation
    var conversation = watson.conversation({
        url: "https://gateway.watsonplatform.net/conversation/api",
        username: process.env.Conversation_username || '6a66ea6b-9988-4a21-8977-bc8c0f6ec761',
        password: process.env.Conversation_password || 'ntoHJXQAIJEr',
        version_date: '2016-09-20',
        version: 'v1'
    });
}

//Create the service wrapper for Cloudant
var cloudantUrl = process.env.Cloudant_Url ||'https://134d6d53-3627-43d4-b745-5a7fc394f368-bluemix:74922ca7dc8d65db228df2b25327e02993b0ffbd127de572300fba0432301321@134d6d53-3627-43d4-b745-5a7fc394f368-bluemix.cloudant.com' ;
var cloudantUsr = process.env.Cloudant_Usr || '134d6d53-3627-43d4-b745-5a7fc394f368-bluemix' ;
var cloudantPass = process.env.Cloudant_Pass || '74922ca7dc8d65db228df2b25327e02993b0ffbd127de572300fba043230132';


//If the cloudantUrl has been configured then we will want to set up a nano client for each database
var nano = require('nano')(cloudantUrl);
var logDB = nano.db.use('olivia_conv_logs');
var ansDB = nano.db.use('olivia_db_answers');
var feedBackDB = nano.db.use('angie_db_feedback');

//Create the service wrapper for Retrieve and Rank   ==> Changed to use the DEV space - R&R service
var retrieve_and_rank = watson.retrieve_and_rank({
	username: process.env.RR_username || 'f2ea9d06-8882-4557-8b90-384a0f93c271',
	password: process.env.RR_password || 'eANML8l0ZbhP',
	version: 'v1'
});
var paramsRR = {
	cluster_id: process.env.RR_cluster || 'scfea413cf_9c13_4968_851a_9120d7895dd1',
	collection_name: process.env.RR_collection || 'HUG',
	wt: 'xslt'
};

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Endpoint to be call from the client side
app.post('/api/message', function (req, res) {

	console.log("/api/message");
	// HUG: f3a7602a-608f-497a-93ef-bcb3a6173bce
	// Cartier: 91f964a7-e57f-4284-8677-b4cc69110f68
	// Firmenish: 4774a819-bd1f-45ff-84a6-fccae4d9effd

	var workspace = process.env.Conversation_workspaceId || '4774a819-bd1f-45ff-84a6-fccae4d9effd';

	console.log("NO LOGGIN");
    console.log("w="+workspace);

	var payload = {
		workspace_id: workspace,
		context: {},
		input: {}
	};
	if (req.body) {
		if (req.body.input) {
			payload.input = req.body.input;
		}
		if (req.body.context) {
			// The client must maintain context/state
			payload.context = req.body.context;
		}
	}

    console.log("Payload="+JSON.stringify(payload));

	// Send the input to the conversation service
	conversation.message(payload, function (err, data) {
		if (err) {
			return res.status(err.code || 500).json(err);
		}
		//console.log(updateMessage(payload, data)); 
		return res.json(updateMessage(payload, data));
	});
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response) {
	console.log("##updateMessage##");
	var responseText = null;
	var id = null;
	if (!response.output) {
		response.output = {};
	} else {
		return response;
	}

	if (response.intents && response.intents[0]) {
		var intent = response.intents[0];

		if (intent.confidence >= 0.75) {
			responseText = 'I understood your intent was ' + intent.intent;
		} else if (intent.confidence >= 0.5) {
			responseText = 'I think your intent was ' + intent.intent;
		} else {
			responseText = 'I did not understand your intent';
		}
	}
	response.output.text = responseText;
	return response;
}

//Endpoint to be call for R&R
app.get('/api/retrieveandrank', function (req, res) {
	console.log("/api/retrieveandrank");
	var solrClient = retrieve_and_rank.createSolrClient(paramsRR);

	//Exemple1	
	//var rankerID = '766366x22-rank-2424'; //Replace value if a ranker is available <----------------------------------------------------------------
	var rankerID = process.env.RR_rankerid || '76643bx23-rank-3794' ;
	var query = qs.stringify({ q: req.query.message, ranker_id: rankerID, fl: 'id,title,body,contentHtml,score,ranker.confidence' });

	solrClient.get('fcselect', query, function (err, searchResponse) {
		if (err) {
			console.log('Error searching for documents: ' + err);
		}
		else {
			console.log(searchResponse.response.docs[0]);
			var topThreeRes = [searchResponse.response.docs[0], searchResponse.response.docs[1], searchResponse.response.docs[2]];
			return res.json(topThreeRes);
		}
	});

});


// Endpoint to call for storing logs
app.get('/store/chats', function (request, response) {
	console.log("/store/chats");
	var name = request.query.name;
	var conv = request.query.conv;
	var comment = request.query.comment;
	var date = request.query.date;

	var chatRecord = { 'name': name, 'conv': conv, 'comment': comment, 'date': date };
	logDB.insert(chatRecord, function (err, body, header) {

		if (!err) {
			var logSubRedirect = '/#';

			response.writeHead(302, {
				'Location': logSubRedirect
			});
			response.end();
		}

	});
});

// Endpoint to call for viewing logs
app.get('/retrieve/chats', function (request, response) {

	console.log("/retrieve/chats");
	logDB.view('chats', 'chats_index', function (err, body) {
		if (!err) {
			console.log(JSON.stringify(body));
			var chatLog = [];
			body.rows.forEach(function (doc) {
				chatLog.push(doc.value);
			});

			return response.json(chatLog);
		}
		else {
			return response.json(new Error(err));
		}
	});

});

// Endpoint to call for retrieving docs and answers
app.get('/retrieve/answer', function (request, response) {
	console.log("/retrieve/answer");
	ansDB.view('docs', 'docs_index', function (err, body) {
		if (!err) {
			var docInfo = [];
			body.rows.forEach(function (doc) {
				docInfo.push(doc.value);
			});

			return response.json(docInfo);
		}
		else {
			return response.json(new Error(err));
		}
	});

});

// Endpoint to call for retrieving answers doc binaries
app.get('/load/:docDir', function (req, res) {
	console.log('/load/:docDir');
	var url = cloudantUrl + '/angie_db_answers/' + Buffer(req.params.docDir, 'base64').toString();
	rq.get(url).pipe(res);
});

function B64DecodeUni(str) {
	return decodeURIComponent(Array.prototype.map.call(atob(str), function (c) {
		return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
	}).join(''));
}

//Endpoint to call for T2S
app.post('/T2S/audio', function (req, res) {

	console.log("/T2S/audio");

	 //var angieSays = Buffer(req.body.angieSays, 'base64').toString()
	 var params = {
	 text: req.body.angieSays,
	 voice: 'fr-FR_ReneeVoice',
	 accept: 'audio/wav'
	 };
	 text_to_speech.synthesize(params).pipe(res);

/*    language_translator.translate({
        text: req.body.angieSays,
        source: 'en',
        target: 'fr'
    }, function (err, translation) {
        if (err)
            console.log(err)
        else {
            console.log(translation);
            var params = {
                text: translation.translations[0].translation,
                voice: 'fr-FR_ReneeVoice',
                accept: 'audio/wav'
            };
            text_to_speech.synthesize(params).pipe(res);

        }
    });*/

});



app.post('/T2SEN/audio', function (req, res) {

/*	console.log("/T2SEN/audio");

    //var angieSays = Buffer(req.body.angieSays, 'base64').toString()
    var params = {
        text: req.body.angieSays,
        voice: 'en-US_AllisonVoice',
        accept: 'audio/wav'
    };
    text_to_speech.synthesize(params).pipe(res);*/


	language_translator.translate({
		text: req.body.angieSays,
		source: 'fr',
		target: 'en'
	}, function (err, translation) {
		if (err)
			console.log(err)
		else {
			console.log(translation);
			var params = {
				text: translation.translations[0].translation,
				voice: 'en-US_AllisonVoice',
				accept: 'audio/wav'
			};
			text_to_speech.synthesize(params).pipe(res);

		}
	});


});

app.post('/T2SSP/audio', function (req, res) {
	console.log("/T2SSP/audio");
	language_translator.translate({
		text: req.body.angieSays,
		source: 'fr',
		target: 'es'
	}, function (err, translation) {
		if (err)
			console.log(err)
		else {
			console.log(translation);
			var params = {
				text: translation.translations[0].translation,
				voice: 'es-LA_SofiaVoice',
				accept: 'audio/wav'
			};
			text_to_speech.synthesize(params).pipe(res);

		}
	});
});

//Endpoint to call for S2T
app.post('/S2T/record', upload.single('track'), function (req, res) {

	console.log("s2T-record");

	var params = {
		audio: fs.createReadStream(appRoot + '/' + req.file.path),
		content_type: 'audio/wav',
		model: 'fr-FR_ReneeVoice'
	};

	console.log(params);

	speech_to_text.recognize(params, function (error, transcript) {
		if (error) {

			console.log(error);

			res.status(500).write('\n\n' + error);
			res.end();
			console.log('error:', error);
		}
		else {

			console.log(transcript);

			res.status(200).json(transcript).end();
		}

		fs.unlinkSync(appRoot + '/' + req.file.path);
	});
});

//Endpoint to call for authentifications
app.get('/auth/check', function (request, response) {
	var match = 0;
	var usr = request.query.usrID;
	var psw = request.query.pswID;

	authDB.view('creds', 'creds_index', function (err, body) {
		if (!err) {
			var usrCreds = [];
			body.rows.forEach(function (doc) {
				usrCreds.push(doc.value);
			});

			for (var i = 0; i < usrCreds.length; i++) {
				if (usr == Buffer(usrCreds[i].cldUser, 'base64').toString() && psw == Buffer(usrCreds[i].cldPass, 'base64').toString()) {
					match = 1;
				}
			}
			return response.json(match);
		}
		else {
			return response.json(new Error(err));
		}
	});
});

//Endpoint to call for storing logs
app.get('/store/feedback', function (request, response) {
	var feedBackDoc = {
		date: new Date(),
		conv: request.query.conv,
		convLength: request.query.convLength,
		feedback: request.query.feedback,
		intent: request.query.intent,
		entities: request.query.entities,
		comment: request.query.comment
	}

	feedBackDB.insert(feedBackDoc, function (err, body) {
		if (!err) {
			return response.json('success');
		}
	});
});

module.exports = app;
