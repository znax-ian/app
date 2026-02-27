const axios = require('axios');
const crypto = require('crypto');
const xml2js = require('xml2js');
require('dotenv').config();
// --- 1. CONFIGURATION ---
const CONFIG = {
    host: process.env.ARC_HOST,
    user: '',
    password: ''
};

const BASE_URL = `http://${CONFIG.host}/ArcSuite/2006/08/ws`;

// --- 2. HELPERS ---
function createSoapEnvelope(body, sessionId = null) {
    let header = '';
    if (sessionId) header = `<soap:Header><types:Session>${sessionId}</types:Session></soap:Header>`;
    
    return `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:types="http://www.fujixerox.co.jp/2006/08/arcsuite/ws/types" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${header}<soap:Body>${body}</soap:Body></soap:Envelope>`;
}

function cleanMtomResponse(data) {
    if (typeof data !== 'string') return data;
    const start = data.indexOf('<soap:Envelope');
    const end = data.lastIndexOf('</soap:Envelope>');
    if (start !== -1 && end !== -1) return data.substring(start, end + 16);
    return data; 
}

async function parseXml(xmlInput, tagName) {
    const cleanXml = cleanMtomResponse(xmlInput);
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    
    try {
        const result = await parser.parseStringPromise(cleanXml);
        const find = (obj) => {
            if (!obj) return null;
            if (obj[tagName]) return obj[tagName];
            for (let key in obj) {
                if (typeof obj[key] === 'object') {
                    const found = find(obj[key]);
                    if (found) return found;
                }
            }
            return null;
        };
        let found = find(result);
        if (found && typeof found === 'object' && found._) return found._;
        return found;
    } catch (e) { throw e; }
}

async function parseSearchResults(xmlInput, type) {
    // 1. Clean up the MTOM/Multipart wrapper if present (keeps just the XML part)
    const cleanXml = (data) => {
        if (typeof data !== 'string') return data;
        const startTag = '<soap:Envelope';
        const endTag = '</soap:Envelope>';
        const startIndex = data.indexOf(startTag);
        const endIndex = data.lastIndexOf(endTag);
        if (startIndex !== -1 && endIndex !== -1) {
            return data.substring(startIndex, endIndex + endTag.length);
        }
        return data;
    };

    const xmlContent = cleanXml(xmlInput);
    
    // 2. Parse XML
    const parser = new xml2js.Parser({ 
        explicitArray: false, 
        ignoreAttrs: false, // Important: We need attributes to read 'name="user:customar"'
        tagNameProcessors: [xml2js.processors.stripPrefix] // Strips 'ns2:', 'types:' etc.
    });

    try {
        const result = await parser.parseStringPromise(xmlContent);
        
        // 3. Navigate to the Repository Objects
        // Path: Envelope -> Body -> searchRepositoryObjectsResponse -> searchRepositoryObjectsReturn -> repositoryObject
        const body = result['Envelope']['Body'];

        let targetAttrs = [];
        let responseKey;
        let returnObj;
        let objects;
        // 4. Define the Target Attributes we want to extract
        switch(type) {
            case 'byPeriod':
                // Find the response key dynamically (in case of namespace variations)
                responseKey = Object.keys(body).find(k => k.toLowerCase().includes('searchrepositoryobjectsresponse'));
                if (!responseKey) return [];
                returnObj = body[responseKey]['searchRepositoryObjectsReturn'];
                // Handle cases with 0, 1, or multiple results
                if (!returnObj) return [];
                objects = returnObj['repositoryObject'];
                if (!objects) return [];
                if (!Array.isArray(objects)) objects = [objects];
                targetAttrs = [
                    'system:name',
                    'user:seiban',
                    'user:kouban',
                    'user:zuban',
                    'user:seihin',
                    'user:customar',
                    'user:hinban',
                    'user:buhinzu',
                    'user:part_name',
                    'user:jisyocode',
                    'user:jisyou',
                    'user:kanribangou',
                    'user:origin',
                    'system:modifiedon'
                ];
                break;
            case 'byId':
                responseKey = Object.keys(body).find(k => k.toLowerCase().includes('getrepositoryobjectresponse'));
                if (!responseKey) return [];
                objects = body[responseKey]['getRepositoryObjectReturn'];
                // Handle cases with 0, 1, or multiple results
                if (!objects) return [];
                if (!Array.isArray(objects)) objects = [objects];
                targetAttrs = [
                    'system:name',
                    'user:seiban',
                    'user:kouban',
                    'user:zuban',
                    'user:seihin',
                    'user:customar',
                    'user:part_name',
                    'system:modifiedon'
                ];
                break;
        }
        // 5. Map to JSpreadsheet format
        const rows = objects.map(item => {
            const rowData = {};
            
            // Initialize all targets as empty strings (good for spreadsheets)
            targetAttrs.forEach(key => rowData[key] = "");

            // Extract ID (Internal ID)
            rowData['id'] = item.id ? (item.id._ || item.id) : '';

            // Extract Attributes
            if (item.attributes && item.attributes.attribute) {
                const itemAttrs = Array.isArray(item.attributes.attribute) 
                    ? item.attributes.attribute 
                    : [item.attributes.attribute];

                itemAttrs.forEach(attr => {
                    const attrName = attr['$'] ? attr['$'].name : '';
                    
                    // Check if this attribute is one of our targets
                    if (targetAttrs.includes(attrName)) {
                        // Value can be deeply nested depending on type (StringValue, DateTimeValue, etc.)
                        let val = "";
                        const valObj = attr['attributeValue'];
                        
                        if (valObj) {
                            if (valObj.string) val = valObj.string;
                            else if (valObj.value) val = valObj.value;
                            else if (valObj._) val = valObj._;
                            // Add handlers for other types if necessary (e.g., date, integer)
                            else if (valObj.dateTime) val = valObj.dateTime;
                            else if (valObj.int) val = valObj.int;
                        }
                        
                        rowData[attrName] = val;
                    }
                });
            }
            return rowData;
        });

        return rows;

    } catch (e) {
        console.error("XML Parsing Error:", e);
        return [];
    }
}

// --- 3. MAIN LOGIC ---
async function loginToArcSuite() {
    //console.log("-> Fetching Login Challenge...");
    const loginInfoRes = await axios.post(BASE_URL, createSoapEnvelope('<types:getLoginInfo/>'), { headers: {'Content-Type': 'text/xml'}, responseType: 'text' });
    const challenge = await parseXml(loginInfoRes.data, 'challenge');
    const modulus = await parseXml(loginInfoRes.data, 'publicKeyModulus');
    const exponent = await parseXml(loginInfoRes.data, 'publicKeyExponent');
    const tempSession = await parseXml(loginInfoRes.data, 'sessionId');

    //console.log("-> Encrypting Password...");
    const key = crypto.createPublicKey({ key: { kty: "RSA", n: Buffer.from(modulus, 'base64').toString('base64url'), e: Buffer.from(exponent, 'base64').toString('base64url') }, format: 'jwk' });
    const encrypted = crypto.publicEncrypt({ key: key, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(challenge + CONFIG.password));
    const loginXml = `<types:login><types:userId>${CONFIG.user}</types:userId><types:credentialType>http://www.fujixerox.co.jp/2006/08/arcsuite/ws#EncryptedPassword</types:credentialType><types:credential>${encrypted.toString('base64')}</types:credential></types:login>`;
    const loginRes = await axios.post(BASE_URL, createSoapEnvelope(loginXml, tempSession), { headers: {'Content-Type': 'text/xml'}, responseType: 'text' });
    return await parseXml(loginRes.data, 'Session');
}

function makeSearchXml(require, type) {
    let searchXml = '';
    switch(type) {
        case 'byPeriod':
            searchXml = `
                <types:searchRepositoryObjects>
                    <types:attrCondition xsi:type="types:AndCondition">
                        <types:attributeSearchCondition xsi:type="types:TrinaryOperatorCondition" operator="BETWEEN">
                            <types:attributeId name="${require.dateAttr}" ns="rep" />
                            <types:attributeValue xsi:type="types:DateTimeValue">
                                <types:dateTime>${require.startDate}</types:dateTime>
                            </types:attributeValue>
                            <types:attributeValue xsi:type="types:DateTimeValue">
                                <types:dateTime>${require.endDate}</types:dateTime>
                            </types:attributeValue>
                        </types:attributeSearchCondition>
                        <types:attributeSearchCondition xsi:type="types:BinaryOperatorCondition" operator="EQUAL">
                            <types:attributeId name="${require.role}" ns="rep" />
                            <types:attributeValue xsi:type="types:RmsObjectValueRmsObject">
                                <types:rmsObject>
                                    <types:id>${require.user}</types:id>
                                </types:rmsObject>
                            </types:attributeValue>
                        </types:attributeSearchCondition>
                    </types:attrCondition>
                    <types:mode>AND</types:mode>
                    <types:option>
                        <types:searchRegion>
                            <types:id>${require.region}</types:id>
                            <types:depth>0</types:depth>
                        </types:searchRegion>
                    </types:option>
                    <types:limit>1000</types:limit>
                </types:searchRepositoryObjects>
            `
            break;
        case 'byWorkCode':
            searchXml = `
                <types:searchRepositoryObjects>
                    <types:attrCondition xsi:type="types:BinaryOperatorCondition" operator="EQUAL">
                        <types:attributeId name="user:kouban" ns="rep" />
                        <types:attributeValue xsi:type="types:StringValue">
                            <types:string>${require.kouban}</types:string>
                        </types:attributeValue>
                    </types:attrCondition>
                    
                    <types:mode>AND</types:mode>
                    
                    <types:option>
                        <types:searchRegion>
                            <types:id>${require.region}</types:id>
                            <types:depth>0</types:depth>
                        </types:searchRegion>
                    </types:option>
                    <types:limit>500</types:limit>
                </types:searchRepositoryObjects>
            `
            break;
        case 'byId':
            searchXml = `
                <types:getRepositoryObject>
                    <types:id>${require.id}</types:id>
                </types:getRepositoryObject>
            `
    }
    return searchXml;
}

async function getDocList(require, type) {
    try {        
        const sessionId = await loginToArcSuite();
        const sessionString = (typeof sessionId === 'object' && sessionId._) ? sessionId._ : sessionId;
        const searchXml = makeSearchXml(require, type);
        const res = await axios.post(BASE_URL, createSoapEnvelope(searchXml, sessionString), { headers: {'Content-Type': 'text/xml'}, responseType: 'text' });
        const data = await parseSearchResults(res.data, type);
        return data;

    } catch (error) {
        console.error("\n[ERROR] Test Failed:", error.message);
        if (error.response) console.error("Server Response:", cleanMtomResponse(error.response.data));
        throw error;
    }
}

async function login(user, pwd) {
    CONFIG.user = user;
    CONFIG.password = pwd;
    const sessionId = await loginToArcSuite();
    if(sessionId) {
        return { success: true, sessionId };
    } else {
        return { success: false, error: "Login failed" };
    }

}

function hasCredentials() {
    return CONFIG.user.length > 0 && CONFIG.password.length > 0;
}

module.exports = { getDocList, login, hasCredentials };

