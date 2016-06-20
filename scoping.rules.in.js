function _assert(cond, message) { if ( !cond ) { throw new Error(message); } }

// scoping rules
// a note about referencing rules:
// a 'directly referenced' name is a name that has either been used in the body of the current scope, or
// a name that has been used in the body of any of its child non-function scopes without having been resolvable in any of them
// an 'indirectly referenced' name is a name that has been 'directly' or 'indirectly' referenced in a scope's child function scopes
 
// 'var':
// these declarations get hoisted up the lexical scope chain until it reaches a function scope or a catch scope ;
// if it reaches a catch scope and the variable name is in the 'catch'-variables list, the variable will
// not get further hoisted up the lexical scope chain.
// otherwise, in the way of getting hoisted up the lexical scopes , an error will be thrown if a variable of the
// same name is defined in any of those scopes.
// 'let':
// 'let' declarations are simpler.
// if the variable's name not been directly refrenced the in declaration's scope , and it is not in
// the scope's list of defined variables (or it is, but is markd as 'hoisted') , it would get added
//  to scope's list of defined variables; otherwise, an error is thrown

var ROLE_NONE = 0;
var ROLE_CATCH= 2;
var ROLE_FUNC = 5;

var ACCESS_DIRECTLY = !false,
  ACCESS_INDIRECTLY = false ;

function Scope( role , sparent) {
  _assert(sparent||role, role ? "scope must be a function" : "scope must not be main" ) ;

  this.role = role
  this.sparent = sparent
  this.containingFunc = role === ROLE_FUNC ? this : sparent.containingFunc ;
  this.definedIDs = {};
  this.unresolvedIDs = {};

  var acc = function(){};
  acc.prototype = sparent ? sparent.accessibleIDs : {};
  this.accessibleIDs = new acc();

  if ( this.role === ROLE_FUNC )
     this.funcV = {};
  else if ( this.role === ROLE_CATCH )
     this.catchV = {};
}

var Sco = Scope.prototype;
var has = Object.hasOwnProperty;

function findNameAll(name,o) { return (name in o) ? name[o] : null; }
function findOwn(name, o) { return ( has.call(o,name) ) ? o[name] : null; }

Sco.vName = function(varName) { return '#' + varName; };
Sco.unVName = function(vName) { return vName.substring( 1 ); };

Sco.acclist = function(varName) { return findNameAll( this.vName(varName), this.accessibleIDs ); };
Sco.deflist = function(varName) { return findOwn( this.vName(varName), this.definedIDs ); };

Sco.defineCatchVar = function(varName) {
  _assert( this.role === ROLE_CATCH,  "catchVar must not be calld on non-catch scopes");

  var v = this.vName(varName);
  this. definedIDs[v] =
  this.catchV[v] = { isHoisted: !false,
                       isCatch: !false, 
                       isIndirectlyReferenced: false };
};  

Sco.hoist   = function(varName) {
  var v = this.vName(varName) ;
  var scope   = this;  
  while ( !false ) {
    _assert( !(v in this. definedIDs) ||
             this. definedIDs[v].isHoisted, "reached let while hoisting var for: " + varName ) ;

    scope .makeResolved(varName);

    if ( scope.role === ROLE_FUNC )
      break;
    if ( scope.role === ROLE_CATCH && has.call(scope.catchV, v) )  
      break;

    scope.definedIDs[v] = { isHoisted: !false, isIndirectlyReferenced: false };

    if ( scope.sparent )
      scope = scope.sparent;
    else 
      break;
  }   

  scope.definedIDs[v] =
  scope.accessibleIDs[v]  = {
     isHoisted: !false ,
     isIndirectlyReferenced: false,
     isCatch: scope.role === ROLE_CATCH
  }; 

  return scope ;
};

Sco.reflist = function(varName) { return findOwn( this.vName(varName), this.unresolvedIDs ); };

var LET_DECL = 'let';
var VAR_DECL = 'var';

Sco.define =  function(varName, declmode) {
   var v = this.vName(varName);
   if (  declmode === VAR_DECL ) {
     this.hoist(varName);
     return;
   }

   _assert( !(v in this. definedIDs),
      "variable has been declar'd in the current scope: " + varName ) ;
   
   var accessMode = false ;
   if ( v in this.unresolvedIDs )
      accessMode = this.unresolvedIDs[v];

   _assert(accessMode !== ACCESS_DIRECTLY,
      "variable has been used before being declar'd: " + varName );

   this. definedIDs[v] = { isHoisted: false,
     isIndirectlyReferenced : (v in this.unresolvedIDs) && this.unresolvedIDs[v] === ACCESS_INDIRECTLY }; 

   this. makeResolved(varName);    
};

Sco.done = function() {
   if ( !this.sparent ) return;

   var v, varName, ref;
   for ( v in this. unresolvedIDs ) {
        varName = this.unVName(v) ; 
        this. sparent.ref_with_access(varName, this.role === ROLE_FUNC ?
              ACCESS_INDIRECTLY :
              this.unresolvedIDs[v]
        );
   }
};    

Sco.ref = function(varName) { return this. ref_with_access(varName, ACCESS_DIRECTLY )  ; }  ;

Sco.ref_with_access =  function(varName, accessMode ) {
  var v = this.vName(varName);
  if ( this. deflist(varName) ) {
     var e = this.definedIDs[v];
     if ( accessMode === ACCESS_INDIRECTLY )
       e.isIndirectlyReferenced = !false;
    
     return;
  }     

  if ( !(v in this.unresolvedIDs) || this.unresolvedIDs[v] != ACCESS_DIRECTLY )
     this.unresolvedIDs[v] = accessMode;
    
};

Sco.makeResolved = function(varName) {
   delete this.unresolvedIDs[this.vName(varName)];

};
 
