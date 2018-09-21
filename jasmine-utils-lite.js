(function() {
  'use strict';

  /**
   * Spy a method on an object if and only if it is not already a spy.
   * The spy (or the new created spy) is returned.
   *
   * @param {Object} obj Object.
   * @param {string} method The name of the method to spy.
   * @param {string} behavior The name of the spy behavior.
   *    format: {name:<behavior name>, arguments:[]}
   *    e.g. {name: 'andReturn', arguments: [10]}, {name: 'andCallFake', arguments: [function(){}]}
   *      {name: 'andCallThrough', arguments: []}
   * @return {*} The spy, or the original value if it is alreay a spy or it cannot be spied.
   */
  function spyIf(obj, method, behavior) {
    var methodToSpy = obj[method];

    if(typeof methodToSpy === 'function' && !jasmine.isSpy(methodToSpy)) {
      var spy = spyOn(obj, method);

      if(behavior)
          spy[behavior.name].apply(spy, behavior.arguments);

      return spy;
    }

    return methodToSpy;
  }

   /**
   * Spy all methods in object except specified methods.
   *
   * @param {Object} obj Object to spy.
   * @param {Array<string>|string} excepts the array of methods or method to ignore.
   * @param {string} behavior the spy behavior.
   * @return {Object} The spy object.
   */
  function spyAllExcept(obj, excepts, behavior) {
    var methodsToSkip = getMethodsToSkip(excepts);
    
    forEachWritableProperties(obj, function(targetObj, method) {
      var methodToSpy = targetObj[method];
      if(typeof methodToSpy !== 'function')
        return;
      
        var skipMethod = typeof methodsToSkip[method] !== 'undefined' && methodsToSkip[method];
          if(!skipMethod)
            spyIf(targetObj, method, behavior);
    });

    return obj;
  }

  /**
   * Spy all specified methods in object.
   *
   * @param {Object} obj Object to spy.
   * @param {Array<string>|string} methods The method or the array of methods to spy.
   * @param {Array<string>|string} behaviors The behavior or the array of behaviors.
   * @return {Object} The spy object.
   */
  function spyEach(obj, methods, behaviors) {
    var methodsToSpy = Array.isArray(methods) ? methods : [methods],
        spyBehaviors = Array.isArray(behaviors) ? behaviors : [behaviors],
        isSingleBehavior = spyBehaviors.length == 1;
    
    for(var i=0; i<methodsToSpy.length; i++) {
      if(isSingleBehavior)
        spyIf(obj, methodsToSpy[i], spyBehaviors[0]);
      else
        spyIf(obj, methodsToSpy[i], spyBehaviors[i]);
    }

    return obj;
  }

  /**
   * Spy methods in object.
   *
   * @param {Object} obj The object to spy.
   * @return {Object} The spy object.
   */
  function spyAll(obj) {
    return spyAllExcept(obj, []);
  }

  /**
   * Reset a spy.
   *
   * @param {function} spy The spy to reset.
   * @return {void}
   */
  function reset(spy) {
      spy.reset();  
  }

  /**
   * Reset all spy methods in object except given methods.
   *
   * @param {Object} obj The object to reset.
   * @param {Array<string>|string} excepts The map of methods to ignore. {method1: true, method2:false}
   * @return {Object} The spy object.
   */
  function resetAllExcept(obj, excepts) {
    var methodsToSkip = getMethodsToSkip(excepts);
    
    forEachWritableProperties(obj, function(targetObj, method) {
      var methodToSpy = targetObj[method];
      if(typeof methodToSpy !== 'function')
        return;
      
        var skipMethod = typeof methodsToSkip[method] !== 'undefined' && !methodsToSkip[method];
          if(!skipMethod) {
            if(jasmine.isSpy(methodToSpy))
              reset(methodToSpy);
          }
      });
    
    return obj;        
  }

  /**
   * Reset the specified spy methods in the object.
   *
   * @param {Object} obj The object to reset.
   * @param {Array<string>|string} methods The method or the array of methods to reset.
   * @return {Object} The spy object.
   */
  function resetEach(obj, methods) {
    var methodsToSpy = Array.isArray(methods) ? methods : [methods];

    for(var i=0; i<methodsToSpy.length; i++) {
      var spy = obj[methodsToSpy[i]];
      if(jasmine.isSpy(spy))
        reset(spy);
    }

    return obj;
  }

  /**
   * Reset all spy methods in object.
   *
   * @param {Object} obj The object to reset.
   * @return {Object} The spy object.
   */
  function resetAll(obj) {
    return resetAllExcept(obj, []);
  }    
  
  /**
   * Iterate over all entries in object and execute iterator function on it.
   *
   * @param {*} obj Object to iterate over.
   * @param {function} iterator Iterator function.
   * @return {void}
   */
  function forEachWritableProperties(obj, iterator) {  
    var currentProto = obj,  
      foundProps = {};

    while (currentProto) {
      // First, use the for .. in loop.
      for (var i in currentProto) {
        if (!foundProps[i]) {
        var prop = currentProto[i];
        foundProps[i] = true;
        iterator(currentProto, i);
        }
      }

      /* Spy non enumerable properties
       * Be careful, some browsers (like PhantomJS) may return restricted property
       * such as `arguments` or `caller` that cannot be read.
       */
        var props = Object.getOwnPropertyNames(currentProto).filter(function(name) {
          try {
            currentProto[name];
            return false;
          } catch (e) {
            return true;
          }
        });

        if (!currentProto.prototype && Object.getPrototypeOf) {
          var getProtoResult = Object.getPrototypeOf(currentProto);
          if (getProtoResult !== Object.getPrototypeOf({})) {
            Object.getOwnPropertyNames(getProtoResult).forEach(function(p) {
              if (p !== 'constructor' && props.indexOf(p) === -1) {
                props.push(p);
              }
            });
          }
        }

        props.forEach(function(propName) {
          var _prop = currentProto[propName];

            // Handle property if it is has not been seen yet.
            if(propName !== 'prototype' && !foundProps[propName]) {
              var descriptor = Object.getOwnPropertyDescriptor(currentProto, propName) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(currentProto), propName);

              if(descriptor.writable) {
                foundProps[propName] = true;
                iterator(currentProto, propName);
              }
            }
        });
      
      // Go up in the prototype chain.
        if (currentProto.prototype) {
          currentProto = currentProto.prototype;
        } else {
          currentProto = null;
        }
    }
  }
  
  /**
   * find spy calls with given argument
   *
   * @param {Spy} obj spy object
   * @param {String} method spied method name.
   * @return {Object} arg spied method argument
   */
  function getCallWithArg(obj, method, arg) {
    var calls = obj[method].calls,
      call,
      callWithArg,
      args,
      i;
  
    for(i=0; i<calls.length; i++) {
      call = calls[i];
      args = call.args;
      if(args.indexOf(arg) != -1) {
        callWithArg = call;
        break;
      }
    }
    
    return callWithArg;
  }
  
  function getMethodsToSkip(excepts) {
    var methodsToSkip = {};
    if(Array.isArray(excepts)) {
      excepts.forEach(function(method) {
        methodsToSkip[method] = true;
      })
    } else
      methodsToSkip[excepts] = true;
    
    return methodsToSkip;
  }
  
  function toBeEmpty() {
    return (this.actual && (this.actual.length===0));
  }
  
  function addMatchers(matchersPrototype) {
    var parent = jasmine.getEnv().matchersClass,
        newMatchersClass;
    
    newMatchersClass = function() {
        parent.apply(this, arguments);
    };
    
    jasmine.util.inherit(newMatchersClass, parent);
    jasmine.Matchers.wrapInto_(matchersPrototype, newMatchersClass);
    jasmine.getEnv().matchersClass = newMatchersClass;
  }
  
  addMatchers({
    toBeEmpty: toBeEmpty
  });

   var spyUtils = {
    spyIf: spyIf,
    resetAllExcept: resetAllExcept,
    resetEach: resetEach,
    resetAll: resetAll,
    spyAllExcept: spyAllExcept,
    spyEach: spyEach,
    spyAll: spyAll,
    getCallWithArg : getCallWithArg
  };

  // Expose utility functions.
  for(var spyUtilKey in spyUtils)
    jasmine[spyUtilKey] = spyUtils[spyUtilKey];
})();