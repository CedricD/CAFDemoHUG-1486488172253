// The ConfigPanel module is designed to handle
// all display and behaviors of the payload display panel
/* eslint no-unused-vars: "off" */
/* global Api: true, Common: true*/

var configPanel = (function() {

console.log("Loading Panels2.js");	

  var selectors = {
	      chatBox: 'scrollingChat',
	      resBox: 'response-panel',
	      logBox: 'logDatesContainer',
	      pldBox: 'payload-column',
	      resSrc: 'external-icn',
  		  cldnDB: '/olivia_db_answers',
	      cldUrl:  "https://a7e2b486-2819-4a57-b22a-ad247429f711-bluemix:0377c0120a15a5b5ae5540747e44859c50b28da03ec3d876e9036b971545ba4c@a7e2b486-2819-4a57-b22a-ad247429f711-bluemix.cloudant.com"
  };
  
  var exLink = null;

  // Publicly accessible methods defined
  return {
    setLink: setLink,
    clearPanels: clearPanels,
    responePanel: responePanel,
    rrPanel: rrPanel,
    confirmLogSub: confirmLogSub,
    cancelLogSub: cancelLogSub,
    setLogToCon: setLogToCon,
    searchChatLog: searchChatLog,
    setFeedBack: setFeedBack,
    feedComment: feedComment,
    rrAnswerFail:rrAnswerFail,
    rrAnswerPass:rrAnswerPass,
    setVolume:setVolume,
	clearPayloadPanel: clearPayloadPanel
  };
  
  // Clear the conversation Panel and re-initiate it
  function clearPanels() {
    $("#sendT-holder").css('display','none');
    $("#mic-holder").css('display','inline-flex');  
	$("#textInput").val('');	
    document.getElementById(selectors.chatBox).innerHTML = "";
   	document.getElementById(selectors.resBox).innerHTML = "";
   	document.getElementById(selectors.logBox).innerHTML = "";
   	document.getElementById('communityPost').style = "display:none";
   	document.getElementById(selectors.pldBox).style.backgroundImage="url(../img/logo/WatsonBGOptimizedG.png)";
    Api.sendRequest( '', null );
  }
  
  // Clear the payload Panel
  function clearPayloadPanel() {
   	document.getElementById(selectors.resBox).innerHTML = "";
   	document.getElementById(selectors.logBox).innerHTML = "";
   	document.getElementById(selectors.pldBox).style.backgroundImage="url(../img/logo/blank.png)";
   	//document.getElementById(selectors.pldBox).style.backgroundImage="url(../img/logo/banner.jpg)";
   	document.getElementById(selectors.pldBox).style.backgroundSize="1200px";
  }
  
  //Ask for feed-back
  function setFeedBack(ansFound, strConvRes){
	  var convElement = document.getElementById("feedback_Conv");
	  if(convElement){
		  convElement.outerHTML = "";
		  delete convElement;			  
	  }
	  
	  if(ansFound==true){
		var convRes = JSON.parse(strConvRes);
	    document.getElementById(selectors.chatBox).innerHTML +='<div id="feedback_Conv" class="feedBackConv"><p>Please let me know whether you\'re satisfied or not with my answer?</p><div style="text-align: center;"><img id="btnPassConv" onclick=Api.chooseFeedBack("'+Base64.encode(strConvRes)+'","positive") src="img/buttons/pass.png" class="btnRateP"><img id="btnFailConv" onclick=Api.chooseFeedBack("'+Base64.encode(strConvRes)+'","negative") src="img/buttons/fail.png" class="btnRateF"></div></div>';
	    $("#scrollingChat").scrollTop($("#scrollingChat")[0].scrollHeight);
	  }
  }
  
  //Ask for comment if negative feed-back
  function feedComment(strConvRes){ 
	ConversationPanel.displayMessage({input:{text:["Add a comment to my feedback."]}}, 'user');	
	
    var convElement = document.getElementById("failActions");
    if(convElement){
	  convElement.outerHTML = "";
	  delete convElement;			  
    }
    
	var elems = document.getElementsByClassName('message-inner');
	for(var i = 0; i < elems.length; i++) {
	    elems[i].style='position: static';
	}  
	document.getElementById('feedbackSub').style = "display:block";
	
	document.getElementById("subFeedComment").onclick = function() {
		Api.storeFeedBack(strConvRes, 'negative', document.forms['formFeedback'].feedComment.value);
		var elems = document.getElementsByClassName('message-inner');
		for(var i = 0; i < elems.length; i++) {
		    elems[i].style='position: relative';
		}	
		document.getElementById('feedbackSub').style = "display:none";
	 	Api.t2sPlay("Thanks for your feedback, I'll take it into consideration as soon as possible. If you have any further questions, just type along.");
		ConversationPanel.displayMessage({output:{text:["Thanks for your feedback, I'll take it into consideration as soon as possible. If you have any further questions, just type along."]}}, 'watson');			
	};
	
	document.getElementById("cancelFeedComment").onclick = function() {
		document.getElementById('feedComment').value='';
		document.getElementById('feedbackSub').style = "display:none";    	
		Api.storeFeedBack(strConvRes, 'negative');
		var elems = document.getElementsByClassName('message-inner');
		for(var i = 0; i < elems.length; i++) {
		    elems[i].style='position: relative';
		}
	 	Api.t2sPlay("Thanks for your feedback, I'll take it into consideration as soon as possible. If you have any further questions, just type along.");
		ConversationPanel.displayMessage({output:{text:["Thanks for your feedback, I'll take it into consideration as soon as possible. If you have any further questions, just type along."]}}, 'watson');			
	};
}

  // Refresh payload response depending on the intent
  function responePanel(res) {
  	var extInnerHtml = "<img src='../img/buttons/external.png' onclick='configPanel.setLink()' style='cursor: pointer;margin-top: 3rem;margin-left: 45%'>";
  	clearPayloadPanel();
   	
  	if (res.ext_url!=''){
  		exLink = res.ext_url;
  		if (exLink.substr(0, 5) == 'https'){
  				document.getElementById(selectors.resBox).innerHTML = '<iframe src="'+res.ext_url+'?iv_load_policy=3" style="width:100%; height:85%; margin-top:1rem;" frameborder="0"></iframe>';
  		}
  		else{
  			document.getElementById(selectors.resBox).innerHTML = "<div id='content'><h1 dir='ltr'>"+res.title+"</h1><p style='text-align:center'>"+res.descr+"</p>"+extInnerHtml+"</div>";	
  		}
  	}
  	else{
		var docToView = Base64.encode(res.uID+"/"+res.main_doc);
		document.getElementById(selectors.resBox).innerHTML = "<iframe id='frameViewer' src='/web/embed.html?file=/load/"+docToView+"' frameborder='0'></iframe>";
  		exLink = selectors.cldUrl+selectors.cldnDB+'/'+res.uID+'/'+res.main_doc; 	
	}  	  	
  }
  
  //Push R&R answers to the response panel 
  function rrPanel(res) {	  
	if(res[0]){
		clearPayloadPanel();

	 	Api.t2sPlay("J'ai trouvé quelques réponses intéressantes pour vous. Je vous remercie de les revoir et de compléter votre demande le cas échéant");		
		ConversationPanel.displayMessage({output:{text:["J'ai trouvé quelques réponses intéressantes pour vous. Je vous remercie de les revoir et de compléter votre demande le cas échéant."]}}, 'watson');		
		for(i=0; i<res.length; i++){
			if(res[i].contentHtml.search("aui-nav")=='-1'){
				var confidence = Math.round(100*parseFloat(res[i]['ranker.confidence']));
                document.getElementById(selectors.resBox).innerHTML += "<div class=\"star-ratings-sprite\"><span style=\"width:"+confidence+"%\" class=\"star-ratings-sprite-rating\"></span></div>";
				document.getElementById(selectors.resBox).innerHTML += "<div class='btnFail"+i+"'><div class='rrTitle'>"+res[i].title+" ("+confidence+"%) </div><div class='rrAnswers'><div class='rrBody'>"+res[i].contentHtml.replace(/<img[^>]*>/g,"").replace(/<\/img[^>]*>/g,"")+"</div></div><div class='rrRate'><img id='btnPass"+i+"' onclick=configPanel.rrAnswerPass("+i+") src='img/buttons/pass.png' class='btnRateP'><img id='btnFail"+i+"' onclick=configPanel.rrAnswerFail(this.id) src='img/buttons/fail.png' class='btnRateF'></div></div>"

			};
		}
		
		var junk = document.getElementsByClassName('aui-group');
		for(var i=0; i<junk.length; i++){
		    if(junk[i]){
		    	junk[i].outerHTML = "";
			  delete junk[i];			  
		    }
		}
	}
	else{
		console.log('RR response: Empty!')
	}
  }
  
  function rrAnswerFail(answerID){
	  $("."+answerID).animate({"margin-top":"-5rem", opacity:"hide"}, 500);
	  
	  var rrAnswer = document.getElementsByClassName(answerID)[0];
	    if(rrAnswer){
	      rrAnswer.outerHTML = "";
		  delete rrAnswer;			  
	    }
	  
	  rrRemAnswers= document.getElementsByClassName('rrTitle');
	  if(rrRemAnswers.length == 0){
		  document.getElementById('communityPost').style = "display:block";
	  }
  }
  
  function rrAnswerPass(count){	  
	  var rrAnswer = document.getElementsByClassName('btnRateP');
	  console.log(rrAnswer)
	  for(i=0;i<3;i++){
		  if(i!=count){
			  $(".btnFail"+i).remove();			  
		  }		  
	  }
	  $(".btnRateF").remove();
	 	Api.t2sPlay("Thank you for helping me enhancing my answers for future users. I'm glad you could find an answer to your request.");		
		ConversationPanel.displayMessage({output:{text:["Thank you for helping me enhancing my answers for future users. I'm glad you could find an answer to your request."]}}, 'watson');		
  }
  
  //Set an external link for the user based on watson's answer
  function setLink(){
  	if(exLink != null){
  		window.open(exLink);
  	}
  	else{
  		console.log('No link to open!')
  	}
  }

  // Display confirmation dialog for submiting chat log
  function confirmLogSub() {
	document.getElementById('logSub').className = "logCon";        
  } 
  
  // Hide confirmation dialog for submiting chat log
  function cancelLogSub() {
	document.getElementById('logSub').className = "logCan"; 
	document.getElementById('communityPost').style = "display:none";
   	document.getElementById(selectors.resBox).innerHTML = "";
  }
  
  function setLogToCon(convLog, id) {
  	var convContainer = document.getElementById(selectors.chatBox);
  	
	convContainer.innerHTML = convLog[id].conv.replace(/from-watson top/g, 'from-watson latest top')+"<div id='interLogConv'></div>";
    convContainer.innerHTML += '<p class="logger-comment">Logger comment: '+convLog[id].comment+'</p>'+"<div id='interLogConv'></div>";
  }
  
  
  // Retrieve and display chat log for admin
  function searchChatLog(convLog) {
  	var container = document.getElementById(selectors.logBox);
  	var convDate;  	
  	clearPayloadPanel();
  	
	container.innerHTML = '<p style="margin:0rem -15% 2rem -15%;font-weight:bold;font-size:18px;">Please select the conversation log you want to display:</p>';
	console.log(convLog.length);
	if(convLog.length>0){
	var i= convLog.length-1;
		while(i>=0){
			console.log(convLog[i].date);
			if(convLog[i].date != undefined){
				convDate = '<form id="logDates" onClick="Api.displayConvLog('+i+')"><p>Log Date: '+convLog[i].date+'</p></form>';
				container.innerHTML += convDate;			    
		  	}
		i--;
		}
	}
	else{
		container.innerHTML += '<form id="logDates"><p>Conversation log database is currently empty</p></form>';
	}
  }
  
  function setVolume(className){
	  switch(className){
	  	case 'volOn':
	  		$("#volSet>img").attr("src", "../img/buttons/volOff.png");
	  		$("#volSet>img").attr('class', 'volOff');
	  		break;
	  	case 'volOff':
	  		$("#volSet>img").attr("src", "../img/buttons/volOn.png");
	  		$("#volSet>img").attr('class', 'volOn');
	  		break;
	  }
  }
  	
}());

// Create Base64 Object
var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}
