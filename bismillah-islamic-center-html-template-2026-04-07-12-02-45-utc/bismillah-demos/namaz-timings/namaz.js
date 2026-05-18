$(document).ready(function(){
  'use strict';
  
/* http://api.aladhan.com/v1/timingsByCity?city=Dubai&country=United%20Arab%20Emirates&method=8  //azan times
https://api.aladhan.com/timingsByAddress/09-03-2015?address=Dubai,UAE&method=8&tune=2,3,4,5,2,3,4,5,-3  //(prayer-time) adding offset using tune
All credit to api aladhan for providing such a great source for displaying namaz timings.
*/


});//===== Document Ready Ends =====//

function get_azan_time(selectObject) {
   
   var value = selectObject.value;  
	var azan_time_json_url = "https://api.aladhan.com/v1/timingsByCity?city="+ value +"&country="+ value +"&method=8"; // Thanks to API Aladhan.com
	var namaz_time_json_url = "https://api.aladhan.com/v1/timingsByCity?city="+ value +"&country="+ value +"&method=8&tune=2,10,10,10,10,10,10,10,10";
	
	$.getJSON(azan_time_json_url, function (data) {
		 "use strict";
		 var status = data.code;
		 var timings = data.data.timings; // Azan Timings
		 
		if(status == 200){
			for(var i = 0; i < 1; i++) {
				
				$(".fajr-azan-time").html(get_meridian(timings.Fajr));
				$(".sunrise-azan-time").html(get_meridian(timings.Sunrise));
				$(".zohar-azan-time").html(get_meridian(timings.Dhuhr));
				$(".asr-azan-time").html(get_meridian(timings.Asr));
				$(".maghrib-azan-time").html(get_meridian(timings.Maghrib));
				$(".isha-azan-time").html(get_meridian(timings.Isha));
				$(".juma-azan-time").html(get_meridian(timings.Sunset));
				
			}

		}else{
			  // API Not Working 
		}
	});
	
	$.getJSON(namaz_time_json_url, function (data) {
		 "use strict";
		 var status = data.code;
		 var timings = data.data.timings; // Prayer Timings
		 
		 $("#result-update").html('Showing Results: Namaz Timings of' + ' ' + '<span class ="country">' + value + '</span>');
		 
		if(status == 200){
			for(var i = 0; i < 1; i++) {
				$(".fajr-azan-prayer").html(get_meridian(timings.Fajr));
				$(".sunrise-azan-prayer").html(get_meridian(timings.Sunrise));
				$(".zohar-azan-prayer").html(get_meridian(timings.Dhuhr));
				$(".asr-azan-prayer").html(get_meridian(timings.Asr));
				$(".maghrib-azan-prayer").html(get_meridian(timings.Maghrib));
				$(".isha-azan-prayer").html(get_meridian(timings.Isha));
				$(".juma-azan-prayer").html(get_meridian(timings.Sunset));
				
			}

		}else{
			  // API Not Working 
		}
	});
	
}

function get_meridian(ntime){

	const timeString = ntime + ':00'
	// Append any date. Use your birthday.
	const timeString12hr = new Date('1970-01-01T' + timeString + 'Z')
	  .toLocaleTimeString({},
		{timeZone:'UTC',hour12:true,hour:'numeric',minute:'numeric'}
	  );
	return(timeString12hr);		

	
}