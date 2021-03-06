var handler = require('./request-handler');
var db = require('./db/config')
var User = require('./db/models/User');
var Goal = require('./db/models/Goal');
var Task = require('./db/models/Task');
var Promise = require('bluebird');
var mp = require('mongodb-promise');

// Generate JSON object for a single goal
var singleTree = function(goalId){
  return new Promise(function(resolve, reject){
    var currGoal;
    var tasksArray;

    Goal.findOne({_id: goalId}, function(err, goal) {
      if (err) {
        throw err;}
      currGoal = {
        id: goal._id.toString(),
        title: goal.title,
        userId: goal.userId,
        children: goal.tasks,
        completed: goal.completed,
        goalId: goal.goalId
      };


      Task.find({goalId: goalId}, function(err, tasksArr) {
        tasksArray = tasksArr.map(function(task){
          return {
            id: task._id.toString(),
            title: task.title,
            children: task.tasks,
            completed: task.completed,
            goalId: task.goalId
          };
        });

        tasksArray.push(currGoal);

        var idToObj = function(input) {
          if (Array.isArray(input)) {
            var outArr = input.map(function(val) {
              for (var i = 0; i < tasksArray.length; i++) {
                if (tasksArray[i]['id'].toString() === val) {
                  return tasksArray[i];
                }
              }
            })
            return outArr;
          } else {
            for (var j = 0; j < tasksArray.length; j++) {
              if (tasksArray[j]['id'].toString() === input) {
                return tasksArray[j];
              }
            }
          }
        }

        var transformChildren = function(obj) {
          var objOut = {};
          for (var i in obj) {
            objOut[i] = obj[i];
          }
          var goodArr = idToObj(obj['children']);
          objOut['children'] = goodArr;
          return objOut;
        }

        var fullObj = function(rootId) {
          var myObj = idToObj(rootId);
          var recurse = function(obj) {
            var outObj = {};
            for (var i in obj) outObj[i] = obj[i];
            if (obj['children'].length === 0) return outObj;
            outObj = transformChildren(obj);
            outObj['children'] = outObj['children'].map(function(child) {
              return recurse(child);
            });
            return outObj;
          }
          return recurse(myObj);
        }
        resolve(fullObj(goalId));
      });
    });

  }); // end of return Promise
}; // end of singleTree


// Create an array of JSON objects associated with goals
exports.generateGoalsArray = function(req, res) {
 
  var outArr = [];
  var userId = req.session.userId;

  User.findOne({_id: userId}).exec(function(err, user){
    var idArr = user.goals;
    if (err) throw err;
    var promises = [];
    for (var i=0; i< idArr.length; i++){
      promises.push(singleTree(idArr[i]))
    }
    Promise.all(promises).then(function(array) {
      res.status(200).send(array);
    })

  })

}



