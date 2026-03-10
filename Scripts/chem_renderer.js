async function productQuery() {

    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';
    try{
        drawing = document.getElementById('productCode').value;

        const result = await window.electronAPI.productQuery(drawing);
        let chemList = [];
        result.BOM.map((row, index) => {
            if (row.Version) { // Assuming your data object has the 'Version' key
                chemList.push(index);
            }
        });


        if (result.success) {
            document.getElementById('spreadsheet').innerHTML = ''; // Clear old table
            jspreadsheet(document.getElementById('spreadsheet'), {
                worksheets: [{
                    worksheetName: '部品表',
                    data: result.BOM,
                    defaultColAlign: 'left',
                    selectionCopy: false,
                    copyCompatibility: false,
                    tableOverflow: true,
                    tableWidth: '100%',
                    tableHeight: '720px',
                    columns: [
                        { type: 'text', title: '図番', name: '図番', width: 100 },
                        { type: 'text', title: '品番', name: '品番', width: 35 },
                        { type: 'text', title: '枝番', name: '枝番', width: 35 },
                        { type: 'text', title: '品目コード', name: '品目コード', width: 180 },
                        { type: 'text', title: '部品名', name: '部品名', width: 200 },
                        { type: 'text', title: '英語名称', name: '英語名称', width: 200 },
                        { type: 'text', title: '材質', name: '材質', width: 150 },
                        { type: 'text', title: 'サイズ・タイプ', name: 'サイズ・タイプ', width: 250 },
                        { type: 'text', title: '記事', name: '記事', width: 250 },
                        { type: 'text', title: 'chemSHERPA', name: 'Version', width: 100 },
                        { type: 'checkbox', title: '調査', width: 40}
                    ]
                },
                {
                    worksheetName: '化学成分',
                    data: result.SUBS,
                    defaultColAlign: 'left',
                    selectionCopy: false,
                    copyCompatibility: false,
                    columnSorting: false,
                    tableOverflow: true,
                    tableWidth: '100%',
                    tableHeight: '720px',
                    freezeColumns: 2,
                    filters: true,
                    columns: [
                        { type: 'text', title: '品目コード', name: 'itemCode', width: 180 },
                        { type: 'text', title: '部品名', name: 'jpartsName', width: 100 },
                        { type: 'hidden', name: 'epartsName', width: 150 },
                        { type: 'text', title: '構成番号', name: 'level', width: 50 },
                        { type: 'text', title: '構成部品番号', name: 'id', width: 150 },
                        { type: 'text', title: '構成部品名称', name: 'partsName', width: 150 },
                        { type: 'text', title: '質量', name: 'partsMass', width: 150,
                            render: function(td, value, x, y, instance){
                                const unit = instance.getValueFromCoords(7, y)
                                td.innerHTML = `${value}${unit}`
                            }
                         },
                        { type: 'hidden', title: '単位', name: 'partsUnit', width: 150 },
                        { type: 'text', title: '物質', name: 'matlName', width: 150 },
                        { type: 'text', title: '用途', name: 'matlPurp', width: 150 },
                        { type: 'text', title: '質量', name: 'matlMass', width: 150,
                            render: function(td, value, x, y, instance){
                                const unit = instance.getValueFromCoords(11, y)
                                td.innerHTML = `${value}${unit}`
                            }
                         },
                        { type: 'hidden', title: '単位', name: 'matlUnit', width: 150 },
                        { type: 'text', title: '分類記号', name: 'matlId', width: 80 },
                        { type: 'text', title: '物質名', name: 'subsName', width: 150 },
                        { type: 'text', title: '濃度(%)', name: 'subsConc', width: 150 },
                        { type: 'text', title: 'CAS NO', name: 'subsCas', width: 150 },
                        { type: 'text', title: 'REACH', name: 'reach', width: 100 },
                        { type: 'text', title: 'EU.RoHS', name: 'rohs', width: 150 },
                        { type: 'text', title: 'CN.RoHS', name: 'crohs', width: 100 },
                        { type: 'text', title: 'TSCA', name: 'tsca', width: 100 },
                        { type: 'text', title: '規制対象', name: 'target', width: 150,
                            render: function(td){td.classList.add('TEL');}
                         },
                        { type: 'text', title: '規制名', name: 'rules', width: 150,
                            render: function(td){td.classList.add('TEL');}
                         },
                        { type: 'text', title: '閾値', name: 'thresholds', width: 50,
                            render: function(td){td.classList.add('TEL');}
                         },
                        { type: 'text', title: '判定', name: 'compliance', width: 40,
                            render: function(td){td.classList.add('TEL');}
                         },
                        { type: 'text', title: '物質群コード', name: '物質群コード', width: 100,
                            render: function(td){td.classList.add('HHT');}
                         },
                        { type: 'text', title: '分類', name: '分類', width: 100,
                            render: function(td){td.classList.add('HHT');}
                         },
                        { type: 'text', title: '分類名', name: 'NamesJP', width: 150,
                            render: function(td){td.classList.add('HHT');}
                         }
                    ],
                    nestedHeaders:[
                        [
                            { title: '部品表', colspan: '2' },
                            { title: 'chemSHERPA情報', colspan: '15' },
                            { title: 'TEL禁止物質', colspan: '4' },
                            { title: '日立ハイテク禁止物質', colspan: '3' }
                        ]
                    ]
                }],
                contextMenu: function(){
                    let itemsArr = [];
                    itemsArr.push({
                        title: jSuites.translate('詳細'),
                        onclick: function() {
                        alert('ご不明な点がございましたら、システム管理者までお問い合わせください。');
                        }
                    });
                    return itemsArr;
                }
            });
            setTimeout(() =>{
                applyChemClass(chemList)}, 50); // Delay to ensure the table is rendered before applying classes
        }else{
            jSuites.notification({
                showCloseButton: true,
                timeout: 3000,
                error: 1,
                name: '検索エラー',
                message: result.message,
    });
        }
    } catch (error) {
        console.error("Error at productQuery:", error);
        alert("Error at productQuery: " + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

function applyChemClass(highlightedRows) {
    highlightedRows.forEach(rowIndex => {
        // Find the table row (tr) using the data-y attribute which matches the index
        const row = document.querySelector(`#spreadsheet tr[data-y="${rowIndex}"]`);
        if(row){row.classList.add('chem')};
    });
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('product_search').addEventListener('click', productQuery);
});