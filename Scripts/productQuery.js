const sql = require('mssql');
const xml2js = require('xml2js');
const parser = new xml2js.Parser({ explicitArray: false });
const drawing = 'I16044';
const BOM = [];
let counter = 0;
const config = {
    user: 'sa',
    password: 'vtex1263SQL!',
    server: 'SQL15-VTEX\\VTEXBASE',
    //database: 'VTEX_CHEM',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

function makeComp(){
    return {
        itemCode: null,
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
    comp.subsName = sub.$.name;
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

function parseComp(parts,itemcode){
    return {
        itemCode:itemcode,
        name:parts.Main.Product.ProductID.$.name,
        identifier: parts.Main.Product.ProductID.$.identifier
    }
}

function insert(table,comp){
    table.rows.add(
        comp.itemCode,
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

(async () => {
    let pool = null;
    try{
        pool = await sql.connect(config);
        const table = new sql.Table('#temptable');
        table.create = true;
        table.temporary = true;
        table.columns.add('itemCode',sql.NVarChar(150),{nullable: true}); //itemcode
        table.columns.add('level',sql.NVarChar(150),{nullable: true}); //itemcode
        table.columns.add('id',sql.NVarChar(150),{nullable: true}); //identifier
        table.columns.add('partsName',sql.NVarChar(150),{nullable: true});
        table.columns.add('partsMass',sql.NVarChar(150),{nullable: true});
        table.columns.add('partsUnit',sql.NVarChar(150),{nullable: true});
        table.columns.add('matlName',sql.NVarChar(150),{nullable: true});
        table.columns.add('matlPurp',sql.NVarChar(150),{nullable: true});
        table.columns.add('matlMass',sql.NVarChar(150),{nullable: true});
        table.columns.add('matlUnit',sql.NVarChar(150),{nullable: true});
        table.columns.add('matlId',sql.NVarChar(150),{nullable: true});
        table.columns.add('subsName',sql.NVarChar(1024),{nullable: true});
        table.columns.add('subsConc',sql.NVarChar(150),{nullable: true});
        table.columns.add('subsCas',sql.NVarChar(150),{nullable: true});
        table.columns.add('reach',sql.NVarChar(150),{nullable: true});
        table.columns.add('rohs',sql.NVarChar(150),{nullable: true});
        table.columns.add('crohs',sql.NVarChar(150),{nullable: true});
        table.columns.add('tsca',sql.NVarChar(150),{nullable: true});
        
        
        /*
        const V2R1 = await pool.request().query("\
            SELECT 品目コード正規, Xmlfiles \
            FROM VTEX_DWH.dbo.Q_部品表検索用 BOM \
            LEFT JOIN VTEX_DWH.dbo.部品台帳 PAR ON BOM.品目コード = PAR.品目コード \
            LEFT JOIN VTEX_CHEM.dbo.T_chemFiles CHM ON BOM.品目コード = CHM.ItemCode \
            WHERE 製品コード = '" + drawing + "'")*/
        
        const V2R1 = await pool.request().query("\
            WITH temp AS ( \
            SELECT CASE WHEN BOM.品目コード = Grease.EN THEN Grease.ItemCode ELSE BOM.品目コード END AS 品目コード \
            FROM VTEX_DWH.dbo.Q_部品表検索用 BOM \
            LEFT JOIN VTEX_CHEM.dbo.Grease ON Grease.EN = BOM.品目コード \
            WHERE 製品コード = '" + drawing + "') \
            SELECT 品目コード, LCH.Xmlfiles, LCH.[Version] \
            FROM temp \
            LEFT JOIN ( \
            SELECT ItemCode, Xmlfiles, [Version], \
                    ROW_NUMBER() OVER (PARTITION BY ItemCode ORDER BY [Version] DESC) AS RowNum \
                FROM VTEX_CHEM.dbo.T_chemFiles \
            ) LCH ON LCH.ItemCode = temp.品目コード AND RowNum = 1");
        
        const V2R1ForUI = V2R1.recordset.map(row => {
            const { Xmlfiles, ...displayData } = row;
            return displayData;
        });

        if(V2R1.recordset.length>0){
            for(let i=0; i<V2R1.recordset.length;i++){
                if(V2R1.recordset[i].Xmlfiles){
                    const V2R1xml = await parser.parseStringPromise(V2R1.recordset[i].Xmlfiles);
                    const itemcode = V2R1.recordset[i]["品目コード"];
                    //console.log(itemcode);
                    if(!BOM.includes(itemcode)){
                        const preComp = parseComp(V2R1xml,itemcode);
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
            return;
        }

        await pool.request().bulk(table);
        console.log('Bulk insert done');
        //const result = await pool.request().query("SELECT * FROM #temptable");
        const result = await pool.request().query("\
            SELECT itemCode,level,id,partsName,partsMass,partsUnit,matlName,matlPurp,matlMass,matlUnit,matlId,subsName,subsConc,subsCas,reach,rohs,crohs,tsca, \
            TELS.targets AS target, TELS.rules AS rules, \
            CAST(TELS.ppb AS FLOAT) / 10000000 AS thresholds, \
            CASE \
                WHEN TELS.ppb IS NULL THEN '' \
                WHEN subsConc > CAST(TELS.ppb AS FLOAT) / 10000000 THEN 'X' \
                ELSE 'O' \
            END AS compliance \
            FROM #temptable TMP \
            LEFT JOIN (\
                SELECT TELK.Contents AS targets, TELM.Contents AS rules, ppb, CAS_NO \
                FROM VTEX_CHEM.dbo.T_Subs_TEL AS TEL \
                LEFT JOIN VTEX_CHEM.dbo.M_TEL TELM ON TELM.Types = TEL.Groups \
                LEFT JOIN VTEX_CHEM.dbo.M_TEL TELK ON TELK.Types = TEL.Targets) AS TELS ON TELS.CAS_NO = TMP.subsCas \
            ORDER BY itemCode, level, id ASC");
        const csv = new ObjectsToCsv(result.recordset);
        await csv.toDisk(`${drawing}.csv`);

    }catch(err){
        if(pool) await pool.close();
        console.error('Error:', err);
    }finally{
        if(pool) await pool.close();
    }
})();