// copied from rayyan/app/assets/javascripts/highlights_manager.js
// manages a list of keyword objects containing id, text and matches
// sorted desc by matches
angular.module('rayyan.utils', [])

.factory('rayyanUtils', function(){
  return {
    capitalize: function(str) {
      return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
    },
    labelPredicate: function(label) { // TODO start using these 2 utils after M. functions are converted to angular modules
      return !label.match(/^__EXR__/)
    },
    cleanExclusionReason: function(reason) {
      return reason.replace(/^__EXR__/, '')
    }
  }  
})

.factory('rayyanHighlightsManager', function(){

  return function(keywords)
  {
    var ana = this
    var regex
    ana.keywords = _.compact(keywords)

    var construct_regex = function()
    {
      // sort by name length desc so that keywords subset of others appears later than their supersets
      ana.keywords.sort(function(a, b){
        return b.length - a.length
      })
      var str = "\\b(" + ana.keywords.join("|") + ")\\b"
      // replace spaces/punctuations in keywords by spaces/punctuations in regex
      str = str.replace(/[\s-'"\.,;]+/g, "[\\s-'\"\\.,;]+")
      regex = new RegExp(str, "ig")
    }

    construct_regex()

    ana.empty = function()
    {
      return ana.keywords.length == 0
    }

    ana.add = function(keyword)
    {
      // add keyword to list
      if (!_.isEmpty(keyword)) {
        ana.keywords.push(keyword)
        construct_regex()
      }
    }

    ana.remove = function(keyword)
    {
      // remove keyword from list
      ana.keywords = _.without(ana.keywords, keyword)
      construct_regex()
    }

    ana.highlight = function(html, klass, active)
    {
      // replaces occurences of keywords in html by a css class returning the new html
      if (!html) return "";
      var klasses = 'highlight ' + klass
      if (!active) klasses += ' highlight-hidden'
      var str = html.replace(regex, "<span class='"+klasses+"'>$1</span>")
      return str
    }

  }


})
