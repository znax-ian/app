const sql = require('mssql');
const xml2js = require('xml2js');
const parser = new xml2js.Parser({ explicitArray: false });
const crypto = require('crypto');
const password = 'Tum090T65hVZC1ZEOLK5aU4vJ8+8msCwhDJgjlefMGc=';
const salt = 'BXqiA1RplsOrZXxA6XWh0A==';
const algorithm = 'aes-256-cbc';

let counter = 0;

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        requestTimeout: 60000,
        packetSize: 32768,
        maxRowBufferSize: 10000
    }
};

function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'base64');
    const key = crypto.scryptSync(password, salt, 32);
    const encryptedText = Buffer.from(textParts.join(':'), 'base64');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function makeComp(){
    return {
        itemCode: null,
        jpartsName: null,
        epartsName: null,
        layer: null,
        level:null,
        id:null,
        partsName:null,
        partsMass:null,
        partsUnit:null,
        matlName:null,
        matlPurp:null,
        matlMass:null,
        matlUnit:null,
        matlId:null,
        subsName:null,
        subsConc:null,
        subsCas:null,
        reach:null,
        rohs:null,
        tsca:null
    }
};

function explore(sub,layer,table,precomp){
    let comp = makeComp();
    comp.itemCode = precomp.itemCode;
    comp.jpartsName = precomp.jpartsName;
    comp.epartsName = precomp.epartsName;
    if(counter === 0){
        comp.id = sub.ProductID.$.identifier || precomp.identifier;
        counter++;
    }else{
        if(!sub.ProductID.$.identifier){
            comp.id = 'Parts' + counter.toString().padStart(5,'0');
            counter++;
        }else{
            comp.id = sub.ProductID.$.identifier;
        }
    }
    comp.partsName = sub.ProductID.$.name || precomp.name;
    comp.level = String(layer + 1);
    if(!sub.Material){
        insert(table,comp)
        if(sub.ProductPart){
            if(sub.ProductPart.length){
                for(let i=0;i<sub.ProductPart.length;i++){
                    let parts = sub.ProductPart[i];
                    explore(parts,layer+1,table,precomp);
                }
            }else{
                let parts = sub.ProductPart;
                explore(parts,layer+1,table,precomp);
            }
        }
    }else{
        comp.partsMass = sub.ProductID.Mass.$.mass;
        comp.partsUnit = sub.ProductID.Mass.$.unitOfMeasure
        if(sub.Material.length){
            for(let i=0;i<sub.Material.length;i++){
                let material = sub.Material[i];
                getMaterial(material,comp,table);
            }
        }else{
            let material = sub.Material;
            getMaterial(material,comp,table);
        }
    }
}

function getMaterial(sub,comp,table){
    comp.matlName = sub.$.name;
    let purpose = sub.$.comment;
    comp.matlPurp = purpose.substring(0,1);
    comp.matlId = sub.MaterialID.EntryID.$.entryIdentity;
    comp.matlMass = sub.Mass.$.mass;
    comp.matlUnit = sub.Mass.$.unitOfMeasure;
    if(!sub.Substance){
        insert(table,comp);
    }else{
        if(sub.Substance.length){
            for(let i=0;i<sub.Substance.length;i++){
                let substance = sub.Substance[i];
                getSubstance(substance,comp,table);
            }
        }else{
            let substance = sub.Substance;
            getSubstance(substance,comp,table);
        }
    }
}

function getSubstance(sub,comp,table){
    comp.subsName = sub.$.name.substring(0,150);
    comp.subsCas = sub.SubstanceID.EntryID.$.entryIdentity;
    comp.subsConc = sub.MassPercent.$.massPercent;
    if(!sub.Exemptions){
        comp.reach = null;
        comp.rohs = null;
        comp.crohs = null;
        comp.tsca = null;
        insert(table,comp);
    }else{
        if(sub.Exemptions.length){
            for(let i=0;i<sub.Exemptions.length;i++){
                let exemption = sub.Exemptions[i];
                getExemption(exemption,comp,table);
            }
            insert(table,comp);
        }else{
            let exemption = sub.Exemptions;
            getExemption(exemption,comp,table);
            insert(table,comp);
        }
    }

}

function getExemption(sub,comp){
    let identity = sub.UniqueID.$.identity;
    if(identity.includes('REACH')){comp.reach = sub.Exemption.$.regIndex};
    if(identity.includes('RoHS')){
        if(identity.includes('China')){
            comp.crohs = sub.Exemption.$.regIndex;
        }else{
            comp.rohs = sub.Exemption.$.regIndex;
        }
        
    };
    if(identity.includes('TSCA')){comp.tsca = sub.Exemption.$.regIndex};    
}

function parseComp(parts,itemcode, japaneseName, englishName){
    return {
        itemCode:itemcode,
        jpartsName:japaneseName,
        epartsName:englishName,
        name:parts.Main.Product.ProductID.$.name,
        identifier: parts.Main.Product.ProductID.$.identifier
    }
}

function insert(table,comp){
    table.rows.add(
        comp.itemCode,
        comp.jpartsName,
        comp.epartsName,
        comp.level,
        comp.id,
        comp.partsName,
        comp.partsMass,
        comp.partsUnit,
        comp.matlName,
        comp.matlPurp,
        comp.matlMass,
        comp.matlUnit,
        comp.matlId,
        comp.subsName,
        comp.subsConc,
        comp.subsCas,
        comp.reach,
        comp.rohs,
        comp.crohs,
        comp.tsca
    )
}

async function getProductDetail(drawing) {
    const decryptedpw = decrypt(config.password)
    config.password = decryptedpw;
    let pool = null;
    const BOM = [];
    try{
        pool = await sql.connect(config);
        await pool.request().query(`IF OBJECT_ID('tempdb..#temptable') IS NOT NULL DROP TABLE #temptable`);
        const table = new sql.Table('#temptable');
        table.create = true;
        table.temporary = true;
        table.columns.add('itemCode',sql.NVarChar(200),{nullable: true}); //itemcode
        table.columns.add('jpartsName',sql.NVarChar(200),{nullable: true}); //parts name in Japanese, for display only
        table.columns.add('epartsName',sql.NVarChar(200),{nullable: true}); //parts name in English, for display only
        table.columns.add('level',sql.NVarChar(200),{nullable: true}); //level
        table.columns.add('id',sql.NVarChar(200),{nullable: true}); //identifier
        table.columns.add('partsName',sql.NVarChar(200),{nullable: true});
        table.columns.add('partsMass',sql.NVarChar(200),{nullable: true});
        table.columns.add('partsUnit',sql.NVarChar(200),{nullable: true});
        table.columns.add('matlName',sql.NVarChar(200),{nullable: true});
        table.columns.add('matlPurp',sql.NVarChar(200),{nullable: true});
        table.columns.add('matlMass',sql.NVarChar(200),{nullable: true});
        table.columns.add('matlUnit',sql.NVarChar(200),{nullable: true});
        table.columns.add('matlId',sql.NVarChar(200),{nullable: true});
        table.columns.add('subsName',sql.NVarChar(200),{nullable: true});
        table.columns.add('subsConc',sql.NVarChar(200),{nullable: true});
        table.columns.add('subsCas',sql.NVarChar(200),{nullable: true});
        table.columns.add('reach',sql.NVarChar(200),{nullable: true});
        table.columns.add('rohs',sql.NVarChar(200),{nullable: true});
        table.columns.add('crohs',sql.NVarChar(200),{nullable: true});
        table.columns.add('tsca',sql.NVarChar(200),{nullable: true});
        
        const V2R1 = await pool.request().query(`
            WITH temp AS (
            SELECT CASE WHEN BOM.品目コード = Grease.EN THEN Grease.ItemCode ELSE BOM.品目コード END AS 品目コード, 図番, 品番, 枝番, 部品名, 材質, [サイズ・タイプ], 記事
            FROM VTEX_DWH.dbo.Q_部品表検索用 BOM
            LEFT JOIN VTEX_CHEM.dbo.Grease ON Grease.EN = BOM.品目コード
            WHERE 製品コード = '${drawing}')
            SELECT 図番, 品番,枝番, TMP.品目コード, PAR.部品名, PAR.英語名称, TMP.材質, TMP.[サイズ・タイプ], TMP.記事, LCH.[Version], LCH.Xmlfiles
            FROM temp AS TMP
            LEFT JOIN (
            SELECT ItemCode, Xmlfiles, [Version],
                    ROW_NUMBER() OVER (PARTITION BY ItemCode ORDER BY [Version] DESC) AS RowNum
                FROM VTEX_CHEM.dbo.T_chemFiles
            ) LCH ON LCH.ItemCode = TMP.品目コード AND RowNum = 1
             LEFT JOIN VTEX_DWH.dbo.部品台帳 PAR ON TMP.品目コード = PAR.品目コード
            ORDER BY 品番, 枝番`);
        
        // BOM for jspreadsheet
        const BOM4JSS = V2R1.recordset.map(row => {
            const { Xmlfiles, ...displayData } = row;
            return displayData;
        });

        if(V2R1.recordset.length>0){
            for(let i=0; i<V2R1.recordset.length;i++){
                if(V2R1.recordset[i].Xmlfiles){
                    const V2R1xml = await parser.parseStringPromise(V2R1.recordset[i].Xmlfiles);
                    const itemcode = V2R1.recordset[i]["品目コード"];
                    const japaneseName = V2R1.recordset[i]["部品名"];
                    const englishName = V2R1.recordset[i]["英語名称"];
                    //console.log(itemcode);
                    if(!BOM.includes(itemcode)){
                        const preComp = parseComp(V2R1xml,itemcode, japaneseName, englishName);
                        const composition = V2R1xml.Main.Product.Composition;
                        let parts = null;
                        if(composition){
                            if(composition.ProductPart.length){ //if there are multiple ProductPart
                                for(let i=0; i<composition.ProductPart.length; i++){
                                    parts = composition.ProductPart[i];
                                    explore(parts,1,table,preComp);
                                }
                            }else{ //if there is only one ProductPart
                                parts = composition.ProductPart;
                                explore(parts,1,table,preComp);
                            }
                        }
                        BOM.push(itemcode);
                    }
                }
                counter = 0; //reset counter for next item
            }
        }else{
            console.log('部品表見つかりません');
            if(pool) await pool.close();
            return {success: false, BOM: [], SUBS: [], message: '部品表見つかりません'};
        }

        if(table.rows.length){
            await pool.request().bulk(table);
            const result = await pool.request().query(`
            SELECT itemCode,jpartsName,epartsName,level,id,partsName,partsMass,partsUnit,matlName,matlPurp,matlMass,matlUnit,matlId,subsName,subsConc,subsCas,reach,rohs,crohs,tsca,
            TELS.targets AS target, TELS.rules AS rules,
            CAST(TELS.ppb AS FLOAT) / 10000000 AS thresholds,
            CASE
                WHEN TELS.ppb IS NULL THEN ''
                WHEN subsConc > CAST(TELS.ppb AS FLOAT) / 10000000 THEN 'X'
                ELSE 'O'
            END AS compliance,
            HHTS.物質群コード,
            HHTS.分類,
            HHTS.NamesJP
            FROM #temptable TMP
            LEFT JOIN (
                SELECT TELK.Contents AS targets, TELM.Contents AS rules, ppb, CAS_NO
                FROM VTEX_CHEM.dbo.T_Subs_TEL AS TEL
                LEFT JOIN VTEX_CHEM.dbo.M_TEL TELM ON TELM.Types = TEL.Groups
                LEFT JOIN VTEX_CHEM.dbo.M_TEL TELK ON TELK.Types = TEL.Targets) AS TELS ON TELS.CAS_NO = TMP.subsCas
            LEFT JOIN (
                SELECT CONCAT(HHT.Types,FORMAT(HHT.Groups, '000')) AS 物質群コード,
                    CASE 
                        WHEN HHT.Types = 'H1' THEN '禁止物質'
                        WHEN HHT.Types = 'H2' THEN '管理物質' END AS 分類, HHT.CAS_NO, CAT.NamesJP
                FROM [VTEX_CHEM].[dbo].[T_Subs_HitachiHT] HHT
                LEFT JOIN VTEX_CHEM.dbo.M_HitachiHT CAT ON CONCAT(HHT.Types,FORMAT(HHT.Groups, '000')) = CONCAT(CAT.Types,FORMAT(CAT.Groups, '000'))
                WHERE CAT.NamesJP NOT IN ('GADSL', 'chemSHERPA管理対象物質','JAMP管理対象物質','IEC62474','MDR')
            ) AS HHTS ON HHTS.CAS_NO = TMP.subsCas
            ORDER BY itemCode, id, level ASC`);

            return {success: true, BOM: BOM4JSS, SUBS: result.recordset, message: ''};
        }else{
            return {success: true, BOM: BOM4JSS, SUBS: [], message: ''};
        }

    }catch(err){
        if(pool) await pool.close();
        return {success: false, BOM: [], SUBS: [], message: err.message};
    }finally{
        if(pool) await pool.close();
    }
};

module.exports = { getProductDetail };