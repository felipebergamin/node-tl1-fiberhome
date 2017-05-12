'use strict';

const parser = require('./ResponseParser');
const s = require('net').Socket();

class TL1Client {

    constructor (ip, port, onConnect) {
        onConnect = onConnect || (()=>console.log("Conectado ao TL1"));
        s.setNoDelay(true);
        s.connect(port, ip, onConnect);
    }

    execute (cmd) {
        return new Promise((fulfill, reject)=>{
            s.once('data', data=>{
                fulfill(data);
            });

            s.once('error', ()=>{
                reject('error');
            });

            s.write(cmd);
        });
    }

    processParams (accept_params, received_params) {
        let valid_params = [];
        let target_identifier = '';

        accept_params.forEach(param=>{
            if (param in received_params)
                valid_params.push(`${param}=${received_params[param]}`);
        });

        return valid_params.join(',');
    }

    login(user, passwd, ctag) {
        ctag = ctag || 'LGN';
        const query = `LOGIN:::${ctag}::UN=${user},PWD=${passwd};`;

        return new Promise((resolve, reject)=>{
            this.execute(query)
                .then(response=>{
                    const response_string = response.toString();
                    const parsed_response = parser.operationCommand(response_string);

                    resolve({response_string, parsed_response});
                })
                .catch(reject);
        });
    }

    logout(ctag) {
        ctag = ctag || 'LGT';
        const query = `LOGOUT:::${ctag}::;`;

        return new Promise((resolve, reject)=>{
            this.execute(query)
                .then(response=>{
                    const response_string = response.toString();
                    const parsed_response = parser.operationCommand(response_string);
                    
                    resolve({response_string, parsed_response});
                })
                .catch(reject);
        });
    }

    lstOpticalModuleDDM(params, ctag) {
        const target_id_accept_params = [
            'ONUIP', 'OLTID', 'PONID', 'ONUIDTYPE', 'ONUID', 'PORTID', 'PEERFLAG'
        ];
        const target_identifier = this.processParams(target_id_accept_params, params);
        ctag = ctag || 'LSTD';

        const query = `LST-OMDDM::${target_identifier}:${ctag}::;`;

        return new Promise((resolve, reject)=>{
            this.execute(query)
                .then(response=>{
                    const response_string = response.toString();
                    const parsed_response = parser.queryCommand(response_string);

                    resolve({response_string, parsed_response});
                })
                .catch(reject);
        });
    }

    lstUnregisteredOnu(params, ctag) {
        const accept_params = ['OLTID', 'PONID'];
        const target_identifier = this.processParams(accept_params, params);
        ctag = ctag || 'LSTUN';

        const query = `LST-UNREGONU::${target_identifier}:${ctag}::;`;

        return new Promise((resolve, reject)=>{
            this.execute(query)
                .then(response=>{
                    try {
                        const response_string = response.toString();
                        const parsed_response = parser.queryCommand(response_string);
                        
                        resolve({response_string, parsed_response});
                    } catch (err) {
                        reject(err);
                    }
                })
                .catch(reject);
        })
    }

    addOnu(params, ctag) {
        const target_id_accept_params = [
            'OLTID', 'PONID'
        ];
        const datablocks_accept_params = [
            'AUTHTYPE', 'ONUID', 'PWD', 'ONUNO', 'NAME', 'DESC', 'ONUTYPE'
        ];
        const target_identifier = this.processParams(target_id_accept_params, params);
        const datablocks = this.processParams(datablocks_accept_params, params);
        ctag = ctag || 'ADDO';

        const query = `ADD-ONU::${target_identifier}:${ctag}::${datablocks};`;

        return new Promise((resolve, reject)=>{
            this.execute(query)
                .then(response=>{
                    const response_string = response.toString();
                    const parsed_response = parser.operationCommand(response_string);

                    resolve({response_string, parsed_response});
                })
                .catch(reject);
        });
    }

    deleteOnu(params, ctag) {
        const target_id_accept_params = [
            'OLTID', 'PONID'
        ];
        const datablocks_accept_params = [
            'ONUIDTYPE', 'ONUID'
        ];

        const target_identifier = this.processParams(target_id_accept_params, params);
        const datablocks = this.processParams(datablocks_accept_params, params);
        ctag = ctag || 'SLA';

        const query = `DEL-ONU::${target_identifier}:${ctag}::${datablocks};`;

        return new Promise((resolve, reject)=>{
            this.execute(query)
                .then(response=>{
                    const response_string = response.toString();
                    const parsed_response = parser.operationCommand(response_string);

                    resolve({response_string, parsed_response});
                })
                .catch(reject);
        });
    }

    configureWanConnection(params, ctag) {
        const target_id_accept_params = [
            'ONUIP', 'OLTID', 'PONID', 'ONUIDTYPE', 'ONUID'
        ];
        const datablocks_accept_params = [
            'STATUS', 'MODE', 'CONNTYPE', 'VLAN', 'COS', 'QOS', 'NAT', 'IPMODE', 'WANIP',
            'WANMASK', 'WANGATEWAY', 'MASTERDNS', 'SLAVEDNS', 'PPPOEPROXY', 'PPPOEUSER',
            'PPPOEPASSWD', 'PPPOENAME', 'PPPOEMODE', 'UPORT', 'SSID', 'WANSVC', 
            'UPPROFILENAME', 'DOWNPROFILENAME'
        ];

        const target_identifier = this.processParams(target_id_accept_params, params);
        const datablocks = this.processParams(datablocks_accept_params, params);
        ctag = ctag || 'SLA';

        const query = `SET-WANSERVICE::${target_identifier}:${ctag}::${datablocks};`;

        return new Promise((resolve, reject)=>{
            this.execute(query)
                .then(response=>{
                    try {
                        const response_string = response.toString();
                        const parsed_response = parser.operationCommand(response_string);

                        resolve({response_string, parsed_response});
                    } catch (err) {
                        reject (err);
                    }
                })
                .catch(reject);
        });
    }

    configureLanPort(params, ctag) {
        const target_id_accept_params = [
            'ONUIP', 'OLTID', 'PONID', 'ONUIDTYPE', 'ONUID', 'ONUPORT'
        ];
        const datablocks_accept_params = [
            'BW', 'VLANMOD', 'PVID', 'PCOS'
        ];

        const target_identifier = this.processParams(target_id_accept_params, params);
        const datablocks = this.processParams(datablocks_accept_params, params);
        ctag = ctag || 'CFGLAN';

        const query = `CFG-LANPORT::${target_identifier}:${ctag}::${datablocks};`;

        return new Promise((resolve, reject)=>{
            this.execute(query)
                .then(response=>{
                    try {
                        const response_string = response.toString();
                        const parsed_response = parser.operationCommand(response_string);

                        resolve({response_string, parsed_response});
                    } catch (err) {
                        reject (err);
                    }
                })
                .catch(reject);
        });
    }

    end() {
        s.end();
    }
}

module.exports = TL1Client;