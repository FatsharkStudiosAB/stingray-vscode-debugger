## 1.1.14
* Fixed issue when inserting multiple elements with the same name in a table.
* Moved autocomplete source path to be taken from local binaries directory.

## 1.1.13
* Removed console debug prints

## 1.1.12
* Fixed bug with evaluate_script_expression when hovering strings.

## 1.1.11
* Fixed bug with expanding table (Same version as 1.1.10)

## 1.1.10
* Fixed bug with expanding table.

## 1.1.9
* Updated lua api code completion with changes in adoc.

## 1.1.8
* Added fatshark specific lua api code complete.

## 1.1.7
* Fixed an edge-case where the debugger would get stuck.

## 1.1.6
* Extension now includes another extension to allow launching of debugging sessions from url.

## 1.1.5
* Script project and mapped folder directory mapping now taken from toolchain instead of relying on finding project and mapped folder specific files like .asset_server_directory etc.

## 1.1.4
* Specifying ports for launch configs now allow users to debug multiple instances of the game at the same time

## 1.1.3
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
