import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import _ = require('lodash');

class Adoc {
    private content: any = null;

    constructor(adocFile: string) {
        if (!fs.existsSync(adocFile)) {
            throw new Error("Adoc file doesn't exist: ");
        }

        let buffer = fs.readFileSync(adocFile);
        this.content = JSON.parse(buffer.toString());
    }

    getExactMatch(tokens: string[], fuzzyNs: string = 'stingray') : any {
        let adocContent = this._getAdoc(tokens);
        if (!adocContent && fuzzyNs) {
            adocContent = this._getAdoc([fuzzyNs].concat(tokens));
        }

        return adocContent;
    }

    getPossibleCompletions(tokens: string[]): Array<object> {
        let completions = this._getPossibleCompletions(tokens);
        if (completions.length === 0 && tokens.length > 0 && tokens[0] !== 'stingray') {
            completions = this._getPossibleCompletions(['stingray'].concat(tokens));
        }
        return completions;
    }

    _getPossibleCompletions(tokens: string[]): Array<object> {
        let completions = [];
        let completeTokens = _.dropRight(tokens, 1);
        let lastToken = tokens[tokens.length - 1];
        let currentAdoc = completeTokens.length > 0 ? this._getAdoc(completeTokens) : this.content;
        if (currentAdoc && currentAdoc.members) {
            _.each(currentAdoc.members, (adocValue, key) => {
                if (key.startsWith(lastToken)) {
                    // Best matching of the last token:
                    completions.push(_.merge({label: key}, adocValue));
                }
            });
        }

        return completions;
    }

    _getAdoc (tokens: string[]) : any {
        if (tokens.length === 0) {
            return null;
        }

        let currentAdoc = this.content;

        // Each completeToken must corresponds to an identifier in our help content:
        for (let token of tokens) {
            if (currentAdoc && currentAdoc.members && currentAdoc.members[token]) {
                currentAdoc = currentAdoc.members[token];
            } else {
                return null;
            }
        }
        return currentAdoc;
    }
}

const adocToCompletionKind = {
    namespace: 'Module',
    function: 'Function',
    constant: 'Field',
    object: 'Class',
    enumeration: 'Enum',
    enumerator: 'Value'
}

let adoc = null;
const identifierLegalCharacters = /[a-zA-Z._0-9]/;

function getExpression(text: string, pos: number, fixedEndPos: boolean) : string {
    let startPos = pos;

    // Start at the aucompletion position, and go back until we find a character
    // that is NOT part of the identifier chains (a word boundary, an operator symbol)
    while (startPos >= 0) {
        if (!text.charAt(startPos).match(identifierLegalCharacters)) {
            startPos++
            break;
        }
        --startPos;
    }

    let endPos = pos;
    if (!fixedEndPos) {
        while (endPos < text.length) {
            if (!text.charAt(endPos).match(identifierLegalCharacters)) {
                --endPos;
                break;
            }
            ++endPos;
        }
    }

    return text.substr(startPos, endPos - startPos + 1);
}

function getExpressionOfInterest(document: vscode.TextDocument, position: vscode.Position, fixedPosition: boolean, startPos : number = -1) : string {
    let line = document.lineAt(position.line);
    let lineText = line.text;
    startPos = startPos === -1 ? position.character - 1 : startPos;

    return getExpression(lineText, startPos, fixedPosition);
}

function getFunctionExpression(document: vscode.TextDocument, position: vscode.Position): string {
    let line = document.lineAt(position.line);
    let lineText = line.text;
    let startPos = position.character;
    let nbClosingParens = 0;

    while (startPos >= 0) {
        if (lineText.charAt(startPos) === ')') {
            nbClosingParens++
        } else if (lineText.charAt(startPos) === '(') {
            nbClosingParens--;
            if (nbClosingParens === 0) {
                // Position ourselves on the previous non ( character
                --startPos;
                break;
            }
        }
        --startPos;
    }


    let endPos = startPos;
    while (startPos >= 0) {
        if (!lineText.charAt(startPos).match(identifierLegalCharacters)) {
            startPos++
            break;
        }
        --startPos;
    }

    if (endPos === startPos || startPos >= endPos || startPos < 0) {
        return "";
    }

    return lineText.substr(startPos, endPos - startPos + 1);
}

function functionToString(name, adocSignature) {
    let def = name + '(';
    for (let i = 0; i < adocSignature.types.length; ++i) {
        def += adocSignature.args[i] + ' : ' + adocSignature.types[i];
        if (i < adocSignature.types.length-1) {
            def += ', ';
        }
    }
    def += ')';
    if (adocSignature.rets) {
        def += ' : ' + adocSignature.rets.join('|');
    }

    return def;
}

function adocElementToMarkedString(name, adocElement) {
    let result = '';
    if (adocElement.type === 'function') {
        for (let signature of adocElement.signatures) {
            result += functionToString(name, signature) + '\n';
            result += '\n';
            result += adocElement.desc;
        }
    } else if (adocElement.type === 'namespace' || adocElement.type === 'object') {
        result = 'namespace: **' + name + '**';
        if (adocElement.desc) {
            result += '\n\n' + adocElement.desc;
        }
    } else {
        let info = _.omit(adocElement.members);
        let infoStr = JSON.stringify(info, null, 3);
        result = '```' + infoStr + '```';
    }

    return result;
}

class LuaCompletionItemProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken):Thenable<vscode.CompletionItem[]> {

        let expression = getExpressionOfInterest(document, position, true);

        // All the Stingray API use dot as separator (since it is a C API that doesn't use
        // any fake object oriented programming, we wont use ':' as a separator).
        let tokens = expression.split('.');
        let possibleCompletions = adoc.getPossibleCompletions(tokens);
        if (possibleCompletions.length > 0) {
            return Promise.resolve(possibleCompletions.map(
                completion => {
                    let item = new vscode.CompletionItem(completion.label);
                    if (adocToCompletionKind[completion.type]) {
                        item.kind = adocToCompletionKind[completion.type];
                    }
                    if (completion.desc) {
                        item.documentation = completion.desc;
                    }
                    return item;
                }));
        }

        return Promise.resolve();
    }
}

// NOTE: not used now but could be used to provide in code hovering documentation
// of stingray API.
class LuaHoverProvider implements vscode.HoverProvider {
    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken):
        Thenable<vscode.Hover> {

        let expression = getExpressionOfInterest(document, position, false);
        let tokens = expression.split('.');
        let adocInfo = adoc.getExactMatch(tokens);

        if (adocInfo) {
            let infoStr = adocElementToMarkedString(expression, adocInfo);
            return Promise.resolve(new vscode.Hover(infoStr));
        }

        return Promise.resolve();
    }
}

class LuaSignatureProvider implements vscode.SignatureHelpProvider {
    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.SignatureHelp | Thenable<vscode.SignatureHelp> {
        let expression = getFunctionExpression(document, position);
        let tokens = expression.split('.');
        let adocInfo = adoc.getExactMatch(tokens);

        if(adocInfo && adocInfo.type === 'function') {
            let help = new vscode.SignatureHelp();
            help.signatures = adocInfo.signatures.map(signature => {
                let functionLongName = functionToString(tokens[tokens.length - 1], signature);
                let sig = new vscode.SignatureInformation(functionLongName, adocInfo.desc);
                return sig;
            });

            if (help.signatures.length > 0) {
                help.activeParameter = 0;
                help.activeSignature = 0;
            }

            return Promise.resolve(help);
        }

        return Promise.resolve();
    }
}

const LUA_MODE: vscode.DocumentFilter = { language: 'lua', scheme: 'file' };
export function initialize(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('stingray')
    let toolchain = config.get('toolchainproject').toString();
    let toolchainPath = process.env.BsBinariesDir;
    if (toolchainPath == null)
        toolchainPath = "C:/BitSquidBinaries";
    let apiDoc = path.join(toolchainPath, toolchain, 'tools_external', 'lua_api_stingray3d.json');

    adoc = new Adoc(apiDoc);

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            LUA_MODE, new LuaCompletionItemProvider(), '.', '\"'));

    vscode.languages.registerHoverProvider(
        LUA_MODE, new LuaHoverProvider());

    vscode.languages.registerSignatureHelpProvider(
        LUA_MODE, new LuaSignatureProvider(), ',', '(');
}