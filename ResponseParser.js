'use strict';

const mergeAttribsAndValues = (attribs, data_rows)=>{
    const merged = [];

    data_rows.forEach(row=>{
        if (attribs.length === row.length) {
            const new_obj = {};

            for(var i = 0; i < attribs.length; i++) {
                new_obj[attribs[i].trim().replace(/\s/, '_')] = row[i];
            }

            merged.push(new_obj);
        } else {
            throw new Error(`Quantidade de atributos ${attribs.length} diferente da quantidade de valores ${row.length}`);
        }
    });

    return merged;
}

const operationCommand = response=>{
    const regex_str =
        // header
        '[\\r\\n]*\\s{3}(.{1,})\\s(\\d{4})-(\\d{2})-(\\d{2})\\s(\\d{2}):(\\d{2}):(\\d{2})' +
        // response_id
        '\\r\\nM\\s{2}(\\w{1,})\\s(COMPLD|DELAY|DENY|PRTLRTRV)' +
        // response_block
        '\\r\\n\\s{3}EN=(.+)\\s{3}ENDESC=([\\w\\s=]+)' +
        // terminator
        '\\r\\n(;|>)';
    const regex = new RegExp(regex_str);
    const exec_result = regex.exec(response);

    const parsed_obj = {
        sid: exec_result[1],
        year: exec_result[2],
        month: exec_result[3],
        day: exec_result[4],
        hour: exec_result[5],
        minute: exec_result[6],
        second: exec_result[7],
        ctag: exec_result[8],
        completion_code: exec_result[9],
        error_code: exec_result[10],
        error_description: exec_result[11],
        terminator: exec_result[12]
    };

    return parsed_obj;
}

const queryCommand = response_text=>{
    const regex_str =
        // header
        '\\r\\n{2}\\s{3}(.{1,})\\s(\\d{4})-(\\d{2})-(\\d{2})\\s(\\d{2}):(\\d{2}):(\\d{2})' +
        // response id
        '\\r\\nM\\s{2}(\\w{1,})\\s(COMPLD|DELAY|DENY|PRTLRTRV)' +
        // response block
        '\\r\\n\\s{3}' + 
        // quoted line
        'total_blocks=(\\d+)\\r\\n\\s{3}block_number=(\\d+)\\r\\n\\s{3}block_records=(\\d+)\\r\\n' +
        // result
        '\\r\\n([\\w\\s]+)\\r\\n';// +
        '(-{3,})(-{3,})\\r\\n';
    
    const regex = new RegExp(regex_str);
    const exec_result = regex.exec(response_text);
    const terminator_regex = /(;|>)$/;
    const terminator = terminator_regex.exec(response_text)[1];

    const parsed_obj = {
        sid: exec_result[1],
        year: exec_result[2],
        month: exec_result[3],
        day: exec_result[4],
        hour: exec_result[5],
        minute: exec_result[6],
        second: exec_result[7],
        ctag: exec_result[8],
        completion_code: exec_result[9],
        total_blocks: exec_result[10],
        block_number: exec_result[11],
        block_records: exec_result[12],
        title: exec_result[13],
        attribs: exec_result[14],
        values: exec_result[15],
        terminator: terminator
    };

    // const dashed_line_regex = /-{3,}/g;
    const dashed_line_regex = /\r\n-+\r\n/g;

    const first_dashed_line = dashed_line_regex.exec(response_text);
    const start = first_dashed_line.index + first_dashed_line[0].length;

    const last_dashed_line = dashed_line_regex.exec(response_text);
    const end = last_dashed_line.index;

    const str_tabela = response_text.substring(start, end).trim();
    const linhas_tabela = str_tabela.split('\r\n');

    // console.log(linhas_tabela);

    const array_tabela = linhas_tabela.map(el=>el.split('\t'));

    parsed_obj.attribs = array_tabela.shift();
    parsed_obj.values = mergeAttribsAndValues(parsed_obj.attribs, array_tabela);

    return parsed_obj;
};

module.exports = {
    operationCommand,
    queryCommand
}