## 1.1.2
* Clear breakpoints and continue on disconnecting from an attached debug target

## 1.1.2
* Now properly runs code completion for all workspaces with .lua files

## 1.1
* Now works with Fatshark toolchain configuration

## 1.0
* First version, forked from Autodesk Interactive and updated with custom project management and console connection workflows as well as translating id strings in variabls

## TODO

### Variables
- setVariables bugs:
	- need to prevent modifying up_values
- global as a scope?

### Stingray Commands:
- available in a list similar to tasks? (what to do with commands with args?)

### Auto complete in console
- use generated auto complete file
- use _global variables
- use binaries\editor\resources\lua_api_stingray3d.json
- auto complete engine command if -- is used

### Auto complete in code
- Auto complete resource names from project resources

### Goto
- Need better introspection from Lua
- Goto resource file (lua or not)

### Stingray workflows
- Auto compilation on lua file save
- Right click on text selected: Evaluate selection

### Commands palette:
- Compile and refresh engine
