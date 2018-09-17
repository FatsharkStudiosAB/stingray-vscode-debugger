
import _ = require('lodash');
import * as path from 'path';
import * as fs from 'fs';
import SJSON = require('simplified-json');
import {readFileSync as readFile, existsSync as fileExists} from 'fs';
import {EngineProcess, DEFAULT_ENGINE_CONSOLE_PORT} from './engine-process';
import {findResourceMaps} from './plugins';

export interface LaunchConfiguration {
    tcPath: string;
    engineExe: string;
    projectPath: string;
    additionalPlugins?: string[];
    commandLineArgs?: string[];
}

export class EngineLauncher {
    additionalCommandLineArgs: string[];
    private additionalPlugins: string[];
    private dataDir: string;
    private sourceDir: string;
    private coreRootDir: string;
    private srpPath: any;
    private tcPath: string;
    private tccPath: string;
    private engineExe: string;

    constructor (config: LaunchConfiguration) {
        const tcPath = config.tcPath;
        const engineExe = config.engineExe || "interactive_win64_dev.exe";
        const srpPath = config.projectPath;

        // TODO: Validate that engine exe exists.

        if (!fileExists(tcPath))
            throw new Error(`Invalid ${tcPath} toolchain folder path`);

        if (!fileExists(srpPath))
            throw new Error(`Invalid ${srpPath} project path`);

        this.tcPath = tcPath;
        this.tccPath = path.join(tcPath,"settings","ToolChainConfiguration.config");
        this.srpPath = srpPath;
        this.coreRootDir = tcPath;
        this.engineExe = engineExe;

        // Read project settings to get data dir
        let srpSJSON = readFile(this.srpPath, 'utf8');
        let srp = SJSON.parse(srpSJSON);

        // Get project data dir.
        let srpDir = path.dirname(srpPath);
        let srpDirName = path.basename(srpDir);
        if (srp.data_directory) {
            if (fileExists(srp.data_directory))
                this.dataDir = path.resolve(srp.data_directory);
            else
                this.dataDir = path.join(srpDir, srp.data_directory);
        } else
            this.dataDir = path.join(srpDir, "..", srpDirName + "_data");

        if (srp.source_directory) {
            this.sourceDir = path.join(srpDir, srp.source_directory);
        } else
            this.sourceDir = srpDir;

        // Read toolchain config to get source repository dir if used
        let tccSJSON = readFile(this.tccPath, 'utf8');
        let tcc = SJSON.parse(tccSJSON);

        if (tcc.SourceRepositoryPath != "null") {
            this.coreRootDir = tcc.SourceRepositoryPath;
        }
        // Add platform to data dir, default to `win32` for now.
        this.dataDir = path.join(this.dataDir, 'win32');

        this.sourceDir = this.sourceDir.replace(/^[\/\\]|[\/\\]$/g, '');
        this.dataDir = this.dataDir.replace(/^[\/\\]|[\/\\]$/g, '');
        this.coreRootDir = this.coreRootDir.replace(/^[\/\\]|[\/\\]$/g, '');
        this.additionalPlugins = config.additionalPlugins || [];
        this.additionalCommandLineArgs = config.commandLineArgs || [];
    }

    public start (compile: boolean): Promise<EngineProcess> {
        let engineExe = path.join(this.tcPath, 'engine', 'win64', 'dev', this.engineExe);
        let engineProcess = new EngineProcess(engineExe);
        let compilePromise = Promise.resolve();
        if (compile) {
            let engineArgs = [
                "--compile",
                "--source-dir", `"${this.sourceDir}"`,
                "--map-source-dir", "core", `"${this.coreRootDir}"`,
                "--data-dir", `"${this.dataDir}"`,
                "--enable-remote-cache" ,
                "--enable-remote-cache-shaders" ,
                "--enable-console-log",
                "--port 14999",
            ];

            // Find resource maps under the TCC.
            let resourceMaps = findResourceMaps(this.additionalPlugins.concat([this.tcPath]));
            for (let resourceMap of resourceMaps) {
                engineArgs.push("--map-source-dir");
                engineArgs.push(resourceMap.name);
                engineArgs.push(resourceMap.dir);
            }

            compilePromise = EngineProcess.run(engineExe, engineArgs);
        }

        return compilePromise.then(() => {
            let engineArgs = [
                "--source-dir", `"${this.sourceDir}"`,
                "--map-source-dir", "core", `"${this.coreRootDir}"`,
                "--data-dir", `"${this.dataDir}"`,
                "--wait-for-debugger"
            ];
            engineArgs = engineArgs.concat(this.additionalCommandLineArgs);
            engineProcess.start(engineArgs, DEFAULT_ENGINE_CONSOLE_PORT);
            return engineProcess;
        });
    }
}
