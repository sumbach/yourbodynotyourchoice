/******* GLOBAL VARIABLES *******/
var mapWidth = 850, mapHeight = 600;
var yearsArray = ["grade", "Pre-1973", "1973", "1974", "1975", "1976", "1977", "1977","1977", "1978", "1979", "1980", "1981", "1982", "1983", "1984", "1983", "1984", "1985", "1986", "1987", "1988", "1989", "1989", "1990", "1991", "1992", "1993", "1994", "1995", "1996", "1997", "1998", "1999", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014"];
var Category = ["gradeData", "ConsentData"]
var expressed = Category[0]
var yearExpressed = yearsArray[0]
var removeCPC;
var removeAbortion;
var joinedJson; //Variable to store the USA json combined with all attribute data
var colorize;
var scale;
var currentColors = [];

window.onload = initialize();

//SET UP COLOR ARRAYS FOR MAP + CHART
// Color array for Overview & Waiting Period
    colorArrayGrade = [  "#252525",      //F     //72 hours
                            "#636363",      //D     //48 hours
                            "#969696",      //C     //24 hours
                            "#cccccc",      //B     //18 hours
                            "#f7f7f7"   ];  //A     //None

    // Color array for Prohibited At
    colorArrayProhibited = ["#252525",      //12 weeks
                            "#636363",      //20 weeks
                            "#969696",      //22 weeks
                            "#bdbdbd",      //24 weeks
                            "#d9d9d9",      //3rd trimester
                            "#f7f7f7"   ];  //Viability

    // Color array for Mandated Counseling
    colorArrayCounseling = ["#252525",      //Yes
                            "#f7f7f7"   ];  //No

    // Color array for Parental Consent
    colorArrayConsent = [   "#252525",      //Consent
                            "#969696",      //Notice
                            "#f7f7f7"   ];  //None

    // Color array for Ultrasound
    colorArrayUltrasound = ["#252525",      //Must be performed, offer to view
                            "#636363",      //Must be performed
                            "#969696",      //Must be offered
                            "#f7f7f7"   ];  //None

// SET UP ARRAYS FOR CATEGORIES OF EACH VARIABLE
//Variable array for Overview
    arrayGrades = [     "F",       
                        "D",       
                        "C",          
                        "B",          
                        "A"   ];     

    //Variable array for Prohibited At
    arrayProhibited = [ "12 weeks",     
                        "20 weeks",      
                        "22 weeks",      
                        "24 weeks",      
                        "3rd trimester",      
                        "Viability"   ]; 

    //Variable array for Mandated Counseling
    arrayCounseling = [ "Yes",     
                        "No"   ];  

    //Variable array for Waiting Period
    arrayWaitingPeriod = [  "72 hours",     
                            "48 hours",      
                            "24 hours",      
                            "18 hours",     
                            "None"   ];  

    //Variable array for Parental Consent
    arrayConsent = [    "Consent",    
                        "Notice",      
                        "None"   ];  

    //Variable array for Ultrasound
    arrayUltrasound = ["Must be performed, offer to view",      
                        "Must be performed",      
                        "Must be offered",      
                        "None"   ];  

/*---*******---END OF GLOBAL VARIABLES---*******---*/
//--------------------------------------------------/

//changes active state
$(function(){
    $('.nav li a').on('click', function(e){

        var $thisLi = $(this).parent('li');
        var $ul = $thisLi.parent('ul');

        if (!$thisLi.hasClass('active'))
        {
            $ul.find('li.active').removeClass('active');
                $thisLi.addClass('active');
        }
    })
});

function initialize(){
    setMap();
}; //END initialize
//creates map
function setMap(){
    var map = d3.select(".map")
        .append("svg")
        .attr("width", mapWidth)
        .attr("height", mapHeight)
        .attr("class", "us-map");
    
    //Create a Albers equal area conic projection
    var projection = d3.geo.albersUsa()
        .scale(1000)
        .translate([mapWidth / 2, mapHeight / 2]);
    
    //create svg path generator using the projection
    var path = d3.geo.path()
        .projection(projection);
    
    queue()
        .defer(d3.csv, "data/consent.csv")
        .defer(d3.csv, "data/Grades.csv")
        .defer(d3.json, "data/usa.topojson")
        .defer(d3.json, "data/CPCS.geojson")
        .defer(d3.json, "data/AbortionProviders.geojson")
        .await(callback);
    
    //retrieve and process json file and data
    function callback(error, consent, grade, usa, cpc, abortionprovider){
        
        //Variable to store the USA json with all attribute data
        joinedJson = topojson.feature(usa, usa.objects.states).features;

        //Create an Array with CSV's loaded
        var csvArray = [consent, grade];
        //Names for the overall Label we'd like to assign them
        var attributeNames = ["ConsentData", "gradeData"];
        //For each CSV in the array, run the LinkData function
        for (csv in csvArray){
            LinkData(usa, csvArray[csv], attributeNames[csv]);
        };

        function LinkData(topojson, csvData, attribute){

             var jsonStates = usa.objects.states.geometries;

            //loop through the csv and tie it to the json's via the State Abreviation
             for(var i=0; i<csvData.length; i++){
                var csvState = csvData[i];
                var csvLink = csvState.adm;

                //loop through states and assign the data to the rigth state
                for(var a=0; a<jsonStates.length; a++){

                    //If postal code = link, we good
                    if (jsonStates[a].properties.postal == csvLink){
                        attrObj = {};

                        //one more loop to assign key/value pairs to json object
                        for(var key in yearsArray){
                            var attr = yearsArray[key];
                            var val = (csvState[attr]);
                            attrObj[attr] = val;
                        };

                    jsonStates[a].properties[attribute] = attrObj;
  //                console.log(jsonStates[a].properties)

                    break;
                    };
                };
             }; 
        }; //END linkData

    // console.log statement to show the contents of the joined json object
    // console.log(topojson.feature(usa, usa.objects.states).features);

        //Prep the states to be able to be styled according to the data
        var states = map.selectAll(".states")
            .data(joinedJson)
            .enter()
            .append("path")
            .attr("class", function(d){ 
                return "states " + d.properties.postal;
            })
            .attr("d", function(d) {
                return path(d)
            })
            .style("fill", function(d){
                return choropleth(d, colorScale);
            });

// -- Grab State Abv. from TopoJSON -- (usa.objects.states.geometries[1].properties.postal)
        //data stuff for overlay
        var cpcCount = [];
        for (var a = 0; a < cpc.features.length; a++){
            var cpc_count = cpc.features[a].properties.Count;
            cpcCount.push(Number(cpc_count));
        }
        
        var cpcMin = Math.min.apply(Math, cpcCount);
        var cpcMax = Math.max.apply(Math, cpcCount);
        
        var cpcRadius = d3.scale.sqrt()
            .domain([cpcMin, cpcMax])
            .range([2, 15]);
        
        //for abortion provider
        var abortionCount = [];
        for (var b = 0; b < abortionprovider.features.length; b++){
            var abortion_count = abortionprovider.features[b].properties.Count;
            abortionCount.push(Number(abortion_count));
        }
        
        var abortionMin = Math.min.apply(Math, abortionCount);
        var abortionMax = Math.max.apply(Math, abortionCount);
    
        overlay(path, cpcRadius, map, cpc, abortionprovider);

        setChart(); //draw the chart
    }; //END callback
}; //END setMAP

/* Katie's section start */
//TODO: Resizable SVG?

//menu items function
function drawMenu(){
    //TODO: draw boxes and shade with color scheme (use array.length for help on how many boxes)
    
    //TODO: add legend titles
    
    //TODO: add legend labels
    
    //TODO: have change menu on click

} //END drawMenu

function cpcPoints(map, cpc, path, cpcRadius){
    map.selectAll(".cpcLocations")
        .data(cpc.features)
        .enter()
        .append("path")
        .attr("class", "cpcLocations")
        .attr('d', path.pointRadius(function(d){
            return cpcRadius(d.properties.Count);
        }));   
}; //end cpcPoints

function abortionPoints(map, abortionprovider, path, cpcRadius){
    map.selectAll(".abortionLocations")
            .data(abortionprovider.features)
            .enter()
            .append("path")
            .attr("class", "abortionLocations")
            .attr('d', path.pointRadius(function(d){
                return cpcRadius(d.properties.Count);
            }));
}; //end abortionPoints


//TODO: proportional symbol map overlay
function overlay(path, cpcRadius, map, cpc, abortionprovider){
    $(".cpc-section").click(function(){
        if (d3.selectAll(".cpcLocations")[0].length > 0){
            removeCPC = d3.selectAll(".cpcLocations").remove();
        } else {
            cpcPoints(map, cpc, path, cpcRadius);
        }
    })
    
    $(".abortion-section").click(function(){
        if (d3.selectAll(".abortionLocations")[0].length > 0){
            removeAbortion = d3.selectAll(".abortionLocations").remove();
        } else {
            abortionPoints(map, abortionprovider, path, cpcRadius);
        }
    })
}//END overlay

/* Katie's section end */

//change policy attribute based on click on left-hand menu (who did this??)
function changeAttribute(attribute, data) {

};

//---------------------------------------------//
/* BEAUTIFUL GREYSCALE RAINBOW COLOR GENERATOR */
//---------------------------------------------//
//SET UP COLOR ARRAYS FOR MAP + CHART
// Color array for Overview & Waiting Period   
function colorScale(input){
    if (expressed === "gradeData"){
        console.log(input)
        scale =d3.scale.ordinal(arrayGrades);
        currentColors = colorArrayGrade;
    }else if (expressed === "consentData"){
        scale =d3.scale.ordinal();
        currentColors = colorArrayConsent;
    };
    scale = scale.range(currentColors)

};

function choropleth(d, colorize){
    var value = d.properties ? d.properties[expressed] : d[expressed];
    if (value === "no data") {
        return "#ccc";
    }else if (value != "no data"){
        return colorScale(value[yearExpressed]);
    }else{
        return "#ccc";
    }
};


//---------------------------------------------//
/*              START CHART FUNCTIONS          */
//---------------------------------------------//
// Robin's section

function setChart() {
    var chart = d3.select(".graph")
        .append("svg")
        .attr("width", 90+"%")
        .attr("height", 90+"%")
        .attr("class", "chart");

    var rect = chart.selectAll(".rect")
        .data(joinedJson)
        .enter()
        .append("rect")
        .attr("class", function(d) {
            return "rect " + d.properties.postal;
        })
        .attr("width", 10+"px")
        .attr("height", 10+"px");

    // var rectWidth = 

    // var rect = chart.selectAll(".rect")
    //     .data(joinedJson)
    //     .enter()
    //     .append("rect")
    //     .attr("class", function(d) {
    //         return "rect " + d.properties.postal;
    //     })
    //     .attr("width", )

};


/* ------------END CHART FUNCTIONS------------ */


//TODO: animated sequence buttons
