// The Api module is designed to handle all interactions with the server
function loadingMessage() {
	$("#scrollingChat").append('<div class="loadingWrapper"><div class="segments load"><div class="from-watson latest top"><div class="message-inner"><p></p></div></div></div><div class="modal" id="modalAjax"></div></div>');
}

$(document).ajaxStart(function () {
  loadingMessage()
});

$(document).ajaxStop(function () {
	$("#scrollingChat>.loadingWrapper").remove();
});

var Api = (function () {
  var requestPayload;
  var responsePayload;
  var messageEndpoint = '/api/message';
  var logEndpoint = '/store/chats';
  var feedBackEndpoint = '/store/feedback';
  var convLogEndpoint = '/retrieve/chats';
  var answersEndpoint = '/retrieve/answer';
  var rrEndpoint = '/api/retrieveandrank';
  var T2SEndpoint = '/T2S/audio';
	var T2SEndpointEN = '/T2SEN/audio';
	var T2SEndpointSP = '/T2SSP/audio';
  var S2TEndpoint = '/S2T/record';
  var oldInput = '';

  // Publicly accessible methods defined
  return {
    sendRequest: sendRequest,
    appendToLog: appendToLog,
    chooseFeedBack: chooseFeedBack,
    getConvLog: getConvLog,
    displayConvLog: displayConvLog,
    getCloudantAnswer: getCloudantAnswer,
    getRrAnswer: getRrAnswer,
    encryptedRrAnswer: encryptedRrAnswer,
    setForumTopic: setForumTopic,
    storeFeedBack: storeFeedBack,
    t2sPlay: t2sPlay,
		t2sPlayEN: t2sPlayEN,
		t2sPlaySP: t2sPlaySP,
    micListen: micListen,
    sendTranscript: sendTranscript,

    // The request/response getters/setters are defined here to prevent internal methods
    // from calling the methods without any of the callbacks that are added elsewhere.
    getRequestPayload: function () {
      return requestPayload;
    },
    setRequestPayload: function (newPayloadStr) {
      requestPayload = JSON.parse(newPayloadStr);
    },
    getResponsePayload: function () {
      return responsePayload;
    },
    setResponsePayload: function (newPayloadStr) {
      responsePayload = JSON.parse(newPayloadStr);
    },
		ListenLastMessageFR: function () {
			var message = "";
			if(responsePayload && responsePayload.output && responsePayload.output.text && responsePayload.output.text[0]){
				message = responsePayload.output.text[0];
			}
			t2sPlay(message);
      return "";
    },
		ListenLastMessageEN: function () {
			var message = "";
			if(responsePayload && responsePayload.output && responsePayload.output.text && responsePayload.output.text[0]){
				message = responsePayload.output.text[0];
			}
			t2sPlayEN(message);
      return "";
    },
		ListenLastMessageSP: function () {
			var message = "";
			if(responsePayload && responsePayload.output && responsePayload.output.text && responsePayload.output.text[0]){
				message = responsePayload.output.text[0];
			}
			t2sPlaySP(message);
      return "";
    },				
  };


  // Send a message request to the server
  function sendRequest(text, context) {
		//Remove feedback panel if already displayed
		configPanel.setFeedBack();

    // Build request payload
    var payloadToWatson = {};
    if (text) {
      payloadToWatson.input = {
        text: text
      };
    }
    if (context) {
      payloadToWatson.context = context;
    }

    // Build http request
    var http = new XMLHttpRequest();
    http.open('POST', messageEndpoint, true);
    http.setRequestHeader('Content-type', 'application/json');

    http.onreadystatechange = function () {
      if (http.readyState === 4 && http.status === 200 && http.responseText) {

				configPanel.clearPayloadPanel();	// @CEDRIC - Remove R&R answers
				$("#scrollingChat>.loadingWrapper").remove();
				var parsedRes = JSON.parse(http.responseText);
				if (parsedRes.context.reprompt == false && parsedRes.context.callRR != true) oldInput = parsedRes.input.text;


				if (parsedRes.intents.length != 0) {
					//if((parsedRes.intents[0].confidence < 0.5 || parsedRes.intents[0].intent == 'out_of_scope' || parsedRes.context.callRR) && parsedRes.intents[0].intent != 'off_topic'){
					//parsedRes.intents[0].confidence < 0.7 || parsedRes.intents[0].intent == 'out_of_scope' || 
					if (parsedRes.entities.length != 0) {
						getCloudantAnswer(http.responseText);
					} else {
						//parsedRes.intents[0].confidence < 0.7 ||
					if ((parsedRes.intents[0].intent == 'out_of_scope' || parsedRes.context.callRR || parsedRes.context.call_retrieve_and_rank)) {
						getRrAnswer(parsedRes.input.text + ' ' + oldInput);
					}
					else {
						getCloudantAnswer(http.responseText);
					}
				}
			}
			else {
				getCloudantAnswer(http.responseText);
			}
		}
	};

	var params = JSON.stringify(payloadToWatson);
	// Stored in variable (publicly visible through Api.getRequestPayload)
	// to be used throughout the application
	if (Object.getOwnPropertyNames(payloadToWatson).length !== 0) {
		Api.setRequestPayload(params);
	}

	// Send request
	http.send(params);
	loadingMessage()
}


  //Get answers through Retrieve and Rank service
  function getRrAnswer(convInput) {
	var xmlHttp = new XMLHttpRequest();

	xmlHttp.open("GET", rrEndpoint + "?message=" + convInput, true);
	xmlHttp.onreadystatechange = function () {
		if (xmlHttp.readyState === 4 && xmlHttp.status === 200 && xmlHttp.responseText) {
			$("#scrollingChat>.loadingWrapper").remove();
			var rrAnswers = JSON.parse(xmlHttp.responseText);
			console.log(xmlHttp.responseText);
			configPanel.rrPanel(rrAnswers);
			document.forms['formCommunity'].feedQuestion.value = 'YourNameHere : ' + convInput;
		}
	};

	xmlHttp.send();
	loadingMessage()
}

//Get answers through Retrieve and Rank service for negative feedback
function encryptedRrAnswer(convRes) {
	var deUsrInput = JSON.parse(Base64.decode(convRes)).input.text;
	var xmlHttp = new XMLHttpRequest();

	var convElement = document.getElementById("failActions");
	if (convElement) {
		convElement.outerHTML = "";
		delete convElement;
	}

	ConversationPanel.displayMessage({ input: { text: ["Use Olivia's search engine for further and detailed answers."] } }, 'user');
	xmlHttp.open("GET", rrEndpoint + "?message=" + deUsrInput, true);
	xmlHttp.onreadystatechange = function () {
		if (xmlHttp.readyState === 4 && xmlHttp.status === 200 && xmlHttp.responseText) {
			$("#scrollingChat>.loadingWrapper").remove();
			var rrAnswers = JSON.parse(xmlHttp.responseText);
			configPanel.rrPanel(rrAnswers);
		}
	};

	xmlHttp.send();
	loadingMessage()
}


// Get answers stored in the cloudant db
function getCloudantAnswer(convResStr) {
	var convRes = JSON.parse(convResStr);
	var ansFound = false;

	if (convRes.intents && convRes.intents[0] != undefined) {
		var cResIntent = convRes.intents[0].intent;
		var cResEntities = [];

		for (i = 0; i < convRes.entities.length; i++) {
			cResEntities[i] = convRes.entities[i].entity;
		}

		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", answersEndpoint, true);

		xmlHttp.onreadystatechange = function () {
			if (xmlHttp.readyState === 4 && xmlHttp.status === 200 && xmlHttp.responseText) {
				$("#scrollingChat>.loadingWrapper").remove();
	      	var xmlRes = JSON.parse(xmlHttp.responseText);

				for (i = 0; i < xmlRes.length; i++) {
					if (xmlRes[i].intent == cResIntent) {
						if (xmlRes[i].entities.sort().join(',') === cResEntities.sort().join(',')) {
							if (xmlRes[i].olivia_res != '') {
								convRes.output.text = xmlRes[i].olivia_res;
							}
							configPanel.responePanel(xmlRes[i]);
							ansFound = true;
						}
						else if (convRes.context.mainEnt != undefined) {
							var cResContext = convRes.context.mainEnt.split(',');
							if (xmlRes[i].entities.sort().join(',') === cResContext.sort().join(',')) {
								if (xmlRes[i].olivia_res != '') {
									convRes.output.text = xmlRes[i].olivia_res;
								}
								configPanel.responePanel(xmlRes[i]);
								ansFound = true;
							}
						}
					}
				}
				Api.setResponsePayload(JSON.stringify(convRes));
				configPanel.setFeedBack(ansFound, JSON.stringify(convRes));
			}
		};

		xmlHttp.send();
		loadingMessage()
	}
	else {
		Api.setResponsePayload(JSON.stringify(convRes));
	}
}

function chooseFeedBack(strConvRes, fb) {
	if (fb == 'negative') {
		t2sPlay("Je suis désolé de l'entendre. S'il vous plait sélectionner l'action que vous souhaiteriez que je fasse.");
		ConversationPanel.displayMessage({ output: { text: ["Je suis désolé de l'entendre. S'il vous plait sélectionner l'action que vous souhaiteriez que je fasse:"] } }, 'watson');
		document.getElementById("btnFailConv").onclick = function () { return false; };
		document.getElementById("btnFailConv").style.cursor = "auto";
		var convElement = document.getElementById("btnPassConv");
		if (convElement) {
			convElement.outerHTML = "";
			delete convElement;
		}
		document.forms['formCommunity'].feedQuestion.value = 'YourNameHere : ' + JSON.parse(Base64.decode(strConvRes)).input.text;
		$('#scrollingChat').append('<div id="failActions"><input class="actionsBtn" onClick=configPanel.feedComment("' + strConvRes + '") type="button" value="Add a comment to your feedback"><input class="actionsBtn" type="button" value="Use my search engine for further answers" onClick=Api.encryptedRrAnswer("' + strConvRes + '")></div>');
		$("#scrollingChat").scrollTop($("#scrollingChat")[0].scrollHeight);
	}
	else {
		t2sPlay("Merci de votre avis. Je suis content d'avoir pu vous aider. Merci de me dire si vous avez d'autres demandes.");
		ConversationPanel.displayMessage({ output: { text: ["Merci de votre avis. Je suis content d'avoir pu vous aider. Merci de me dire si vous avez d'autres demandes."] } }, 'watson');
		document.getElementById("btnPassConv").onclick = function () { return false; };
		document.getElementById("btnPassConv").style.cursor = "auto";
		var convElement = document.getElementById("btnFailConv");
		if (convElement) {
			convElement.outerHTML = "";
			delete convElement;
		}
		storeFeedBack(strConvRes, 'postive');
	}
}

function storeFeedBack(strConvRes, fb, comment) {
	var convRes = JSON.parse(Base64.decode(strConvRes));
	var entities = [];

	for (i = 0; i < convRes.entities.length; i++) {
		entities[i] = convRes.entities[i].entity;
	}

	var arr = document.getElementsByClassName('message-inner'), str = '';
	for (var i = 0; i < arr.length; i++) {
		if (arr[i].innerHTML != undefined) {
			str += (arr[i].textContent || arr[i].innerText) + " : ";
		}
	}

	var feedBackDoc = "?conv=" + str + "&convLength=" + document.querySelectorAll('#scrollingChat .from-user').length
		feedBackDoc += "&feedback=" + fb + "&intent=" + convRes.intents[0].intent + "&entities=" + entities + "&comment=" + comment

	// Build http request
	var http = new XMLHttpRequest();
	http.open('GET', feedBackEndpoint + feedBackDoc, true);
	http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

	http.onreadystatechange = function () {
		if (http.readyState === 4 && http.status === 200 && http.responseText) {
			document.getElementById('feedComment').value = '';
	    	$("#scrollingChat>.loadingWrapper").remove();
			console.log('Feedback Stored Succesfully!');
		}
	};

	// Send request
	http.send();
	loadingMessage()
}

// Send a message request to the db
function appendToLog(form) {
	// Build request payload
	var name = 'Conversation Olivia _ ' + new Date();
	var conv = document.getElementById('scrollingChat').innerHTML;
	var comment = form.logComment.value;
	var date = new Date();
	var formDate = (date.getMonth() + 1) + ' / ' + date.getDate() + ' / ' + date.getFullYear() + ' _ Hour: ' + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
	var cloudantQuery = "?name=" + name + "&conv=" + conv + "&comment=" + comment + "&date=" + formDate;

	location = logEndpoint + cloudantQuery;

	/*  
    // Build http request
    var http = new XMLHttpRequest();
    http.open('POST', logEndpoint, true);
	http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    // Send request
    http.send(cloudantQuery);
    */
}

// Get the conversations log from the db
function getConvLog() {
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", convLogEndpoint, true);

	xmlHttp.onreadystatechange = function () {
		if (xmlHttp.readyState === 4 && xmlHttp.status === 200 && xmlHttp.responseText) {
			$("#scrollingChat>.loadingWrapper").remove();
			configPanel.searchChatLog(JSON.parse(xmlHttp.responseText));
		}
	};

	xmlHttp.send();
	loadingMessage()
}

// Get the conversations log from the db
function displayConvLog(dateID) {
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", convLogEndpoint, true);

	xmlHttp.onreadystatechange = function () {
		if (xmlHttp.readyState === 4 && xmlHttp.status === 200 && xmlHttp.responseText) {
			$("#scrollingChat>.loadingWrapper").remove();
			configPanel.setLogToCon(JSON.parse(xmlHttp.responseText), dateID);
		}
	};

	xmlHttp.send();
	loadingMessage()
};

function setForumTopic(question) {
	var urlHook = 'https://hooks.slack.com/services/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';
	var message = 'Pouvez-vous s\il vous plait m\'aider à répondre à la question suivante:\n@' + question;

	$.ajax({
		data: 'payload=' + JSON.stringify({
			"text": message
		}),
		dataType: 'json',
		processData: false,
		type: 'POST',
		url: urlHook
		});

	document.getElementById('communityPost').style = "display:none";
 	t2sPlay("Thanks for your post. You will be notified as soon as someone answer your question. If you have any further questions, just type along.");
	ConversationPanel.displayMessage({ output: { text: ["Thanks for your post. You will be notified as soon as someone answer your question. If you have any further questions, just type along."] } }, 'watson');
};

function t2sPlay(input) {
    var unMute = $("#volSet>img").attr('class') == 'volOn';
    var unMute=true;
	if (unMute) {
		if (input == '') input = 'Bonjour je suis Olivia. Je suis un assistant virtuel créé pour vous aider. Quelle est votre question?'
		var audio = new Audio();
		var xhr = new XMLHttpRequest();
		xhr.open('POST', T2SEndpoint, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.responseType = 'blob';
		xhr.onload = function (evt) {
			var blob = new Blob([xhr.response], { type: 'audio/wav' });
			var objectUrl = window.URL.createObjectURL(blob);
			audio.src = objectUrl;
			audio.play();

			/* Download audio file
			var url = URL.createObjectURL(blob);    
			var a = document.createElement("a");     
			document.body.appendChild(a);     
			a.style = "display: none";     
			a.href = url;     
			a.download = "angieVoice.wav";     
			a.click();     
			window.URL.revokeObjectURL(url);
			*/

			// Release resource when it's loaded
			audio.onload = function (evt) {
				URL.revokeObjectUrl(objectUrl);
			};
		  };
		var data = JSON.stringify({ angieSays: input });
		xhr.send(data);
	};
};


function t2sPlayEN(input) {
	var unMute = $("#volSet>img").attr('class') == 'volOn';
	if (unMute) {
		if (input == '') input = 'Hello, I am Olivia. I am a virtual assistant. How can I help you?'
		var audio = new Audio();
		var xhr = new XMLHttpRequest();
		xhr.open('POST', T2SEndpointEN, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.responseType = 'blob';
		xhr.onload = function (evt) {
			var blob = new Blob([xhr.response], { type: 'audio/wav' });
			var objectUrl = window.URL.createObjectURL(blob);
			audio.src = objectUrl;
			audio.play();

			/* Download audio file
			var url = URL.createObjectURL(blob);    
			var a = document.createElement("a");     
			document.body.appendChild(a);     
			a.style = "display: none";     
			a.href = url;     
			a.download = "angieVoice.wav";     
			a.click();     
			window.URL.revokeObjectURL(url);
			*/

			// Release resource when it's loaded
			audio.onload = function (evt) {
				URL.revokeObjectUrl(objectUrl);
			};
		  };
		var data = JSON.stringify({ angieSays: input });
		xhr.send(data);
	};
};



function t2sPlaySP(input) {
	var unMute = $("#volSet>img").attr('class') == 'volOn';
	if (unMute) {
		if (input == '') input = 'Bonjour je suis Olivia. Je suis un assistant virtuel créé pour vous aider. Quelle est votre question?'
		var audio = new Audio();
		var xhr = new XMLHttpRequest();
		xhr.open('POST', T2SEndpointSP, true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.responseType = 'blob';
		xhr.onload = function (evt) {
			var blob = new Blob([xhr.response], { type: 'audio/wav' });
			var objectUrl = window.URL.createObjectURL(blob);
			audio.src = objectUrl;
			audio.play();

			/* Download audio file
			var url = URL.createObjectURL(blob);    
			var a = document.createElement("a");     
			document.body.appendChild(a);     
			a.style = "display: none";     
			a.href = url;     
			a.download = "angieVoice.wav";     
			a.click();     
			window.URL.revokeObjectURL(url);
			*/

			// Release resource when it's loaded
			audio.onload = function (evt) {
				URL.revokeObjectUrl(objectUrl);
			};
		  };
		var data = JSON.stringify({ angieSays: input });
		xhr.send(data);
	};
};

function micListen(cName) {
	switch (cName) {
		case 'micHolder':
			//start audio record
			aRecorder.recordAudioStream();
			break;
		case 'micHolderRecord':
			document.getElementById("mic-holder").className = "micHolder";
			//send recorded audio to S2T service
			//var blobFile = new File([blob],'recordedAudio.json')
			var blob = aRecorder.processAudioRecord();
			var formData = new FormData();
			formData.append("track", blob, "recordedAudio.wav");

			var xhr = new XMLHttpRequest();
			xhr.open('POST', S2TEndpoint, true);
			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4 && xhr.status === 200 && xhr.responseText) {
					var jTranscript = eval('(' + xhr.responseText + ')');
					if (jTranscript.results[0] != undefined) {
						var transcript = jTranscript.results[0].alternatives[0].transcript
						$("#textInput").focus();
						$("#textInput").val(transcript);
					}

					$('#spin-holder img').attr('src', '../img/loader/spinLoadEnd.gif');
					setTimeout(function () {
						$('#spin-holder').css('display', 'none');
						$("#sendT-holder").css('display', 'inline-flex');
						//$("#mic-holder").css('display','block');
						$('#spin-holder img').attr('src', '../img/loader/spinLoader.gif');
					}, 1000);
	      	}
			};
			xhr.send(formData);
			$("#mic-holder").css('display', 'none');
			$("#spin-holder").css('display', 'inline-flex');
			//loadingMessage()
			break;
	}
};

function sendTranscript() {
	var elm = document.getElementById("textInput");
	var evn = { keyCode: 13 };
	if (elm.value && elm.value != '' && elm.value != ' ') {
		  ConversationPanel.inputKeyDown(evn, elm);
	}

	$("#sendT-holder").css('display', 'none');
	$("#mic-holder").css('display', 'inline-flex');
};

}());

// Create Base64 Object
var Base64 = { _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", encode: function (e) { var t = ""; var n, r, i, s, o, u, a; var f = 0; e = Base64._utf8_encode(e); while (f < e.length) { n = e.charCodeAt(f++); r = e.charCodeAt(f++); i = e.charCodeAt(f++); s = n >> 2; o = (n & 3) << 4 | r >> 4; u = (r & 15) << 2 | i >> 6; a = i & 63; if (isNaN(r)) { u = a = 64 } else if (isNaN(i)) { a = 64 } t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a) } return t }, decode: function (e) { var t = ""; var n, r, i; var s, o, u, a; var f = 0; e = e.replace(/[^A-Za-z0-9+/=]/g, ""); while (f < e.length) { s = this._keyStr.indexOf(e.charAt(f++)); o = this._keyStr.indexOf(e.charAt(f++)); u = this._keyStr.indexOf(e.charAt(f++)); a = this._keyStr.indexOf(e.charAt(f++)); n = s << 2 | o >> 4; r = (o & 15) << 4 | u >> 2; i = (u & 3) << 6 | a; t = t + String.fromCharCode(n); if (u != 64) { t = t + String.fromCharCode(r) } if (a != 64) { t = t + String.fromCharCode(i) } } t = Base64._utf8_decode(t); return t }, _utf8_encode: function (e) { e = e.replace(/rn/g, "n"); var t = ""; for (var n = 0; n < e.length; n++) { var r = e.charCodeAt(n); if (r < 128) { t += String.fromCharCode(r) } else if (r > 127 && r < 2048) { t += String.fromCharCode(r >> 6 | 192); t += String.fromCharCode(r & 63 | 128) } else { t += String.fromCharCode(r >> 12 | 224); t += String.fromCharCode(r >> 6 & 63 | 128); t += String.fromCharCode(r & 63 | 128) } } return t }, _utf8_decode: function (e) { var t = ""; var n = 0; var r = c1 = c2 = 0; while (n < e.length) { r = e.charCodeAt(n); if (r < 128) { t += String.fromCharCode(r); n++ } else if (r > 191 && r < 224) { c2 = e.charCodeAt(n + 1); t += String.fromCharCode((r & 31) << 6 | c2 & 63); n += 2 } else { c2 = e.charCodeAt(n + 1); c3 = e.charCodeAt(n + 2); t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63); n += 3 } } return t } };

function B64EncodeUni(str) {
	return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
		return String.fromCharCode('0x' + p1);
	}));
}

function B64DecodeUni(str) {
	return decodeURIComponent(Array.prototype.map.call(atob(str), function (c) {
		return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
	}).join(''));
}