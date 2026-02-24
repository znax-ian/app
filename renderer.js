async function docSearch() {

    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';

    try {
        const region = document.getElementById('regionSelect').value;
        const role = document.querySelector('input[name="searchRole"]:checked').value;
        const dateAttr = document.querySelector('input[name="dateType"]:checked').value;
        const user = document.getElementById('userSelect').value;
        const startVal = document.getElementById('startDate').value;
        const endVal = document.getElementById('endDate').value;
        const startDate = startVal ? startVal + 'T00:00:00.000Z' : null;
        const endDate = endVal ? endVal + 'T00:00:00.000Z' : null;

        const searchParams = {
            region: region,
            role: role,
            dateAttr: dateAttr,
            user: user,
            startDate: startDate,
            endDate: endDate
        };

        //console.log("Sending to backend:", searchParams);

        const result = await window.electronAPI.search(searchParams, 'byPeriod'); // Pass type to distinguish search context

        if (result.success) {
            //console.log("Data received:", result.data);
            document.getElementById('spreadsheet').innerHTML = ''; // Clear old table
            switch(region) {
                case 'rep:ARCSVTEX:21_HINSHO_CAB':
                    jspreadsheet(document.getElementById('spreadsheet'), {
                        worksheets: [{
                            data: result.data,
                            defaultColAlign: 'left',
                            selectionCopy: false,
                            copyCompatibility: false,
                            columns: [
                            { type: 'text', title: '名前', name: 'system:name', width: 100 },
                            { type: 'text', title: '製番', name: 'user:seiban', width: 20 },
                            { type: 'text', title: '工番', name: 'user:kouban', width: 150 },
                            { type: 'text', title: '図番', name: 'user:zuban', width: 20 },
                            { type: 'text', title: '製品名', name: 'user:seihin', width: 150 },
                            { type: 'text', title: '顧客名', name: 'user:customar', width: 150 },
                            { type: 'text', title: '部品番号', name: 'user:hinban', width: 20 },
                            { type: 'text', title: '部品図番', name: 'user:buhinzu', width: 150 },
                            { type: 'text', title: '部品名称', name: 'user:part_name', width: 100 },
                            { type: 'text', title: '事象コード', name: 'user:jisyocode', width: 100 },
                            { type: 'text', title: '事象', name: 'user:jisyou', width: 100 },
                            { type: 'text', title: '管理番号', name: 'user:kanribangou', width: 100 },
                            { type: 'text', title: '発生元', name: 'user:origin', width: 150 },
                            { type: 'text', title: '最終変更日時', name: 'system:modifiedon', width: 150,
                                render: function(cell, value) {
                                    if (!value) return "";
                                    const date = new Date(value);
                                    const formatter = new Intl.DateTimeFormat('ja-JP', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                        timeZone: 'Asia/Tokyo'
                                    });
                                    const parts = formatter.formatToParts(date);
                                    const p = {};
                                    parts.forEach(part => p[part.type] = part.value);
                                    cell.innerHTML = `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`;
                                }
                            },
                            { type: 'text', title: 'リンク', name: 'id', width: 100,
                                render: function(td, value) {
                                    const idFull = value.substring(4);
                                    const id = idFull.replaceAll(':','%3A');
                                    td.innerHTML = `<a href="http://arcs-vtex.corp.vtex.local/ArcSuite/docspace/sdk/open.do?enc=UTF-8&id=${id}" target="_blank">属性変更</a>`;
                                } // Generate link based on ID, open in new tab
                            }
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
                    break;
                default:
                    jspreadsheet(document.getElementById('spreadsheet'), {
                        worksheets: [{
                            data: result.data,
                            defaultColAlign: 'left',
                            selectionCopy: false,
                            copyCompatibility: false,
                            columns: [
                            { type: 'text', title: '名前', name: 'system:name', width: 250 },
                            { type: 'text', title: '製番', name: 'user:seiban', width: 50 },
                            { type: 'text', title: '工番', name: 'user:kouban', width: 180 },
                            { type: 'text', title: '図番', name: 'user:zuban', width: 50 },
                            { type: 'text', title: '製品名', name: 'user:seihin', width: 150 },
                            { type: 'text', title: '顧客名', name: 'user:customar', width: 150 },
                            { type: 'hidden', name: 'user:hinban'},
                            { type: 'hidden', name: 'user:buhinzu'},
                            { type: 'hidden', name: 'user:jisyocode' },
                            { type: 'hidden', name: 'user:jisyou', width: 100 },
                            { type: 'text', title: '部品名称', name: 'user:part_name', width: 150 },
                            { type: 'hidden', name: 'user:kanribangou' },
                            { type: 'hidden', name: 'user:origin' },
                            { type: 'text', title: '最終変更日時', name: 'system:modifiedon', width: 150,
                                render: function(cell, value) {
                                    if (!value) return "";
                                    const date = new Date(value);
                                    const formatter = new Intl.DateTimeFormat('ja-JP', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                        timeZone: 'Asia/Tokyo'
                                    });
                                    const parts = formatter.formatToParts(date);
                                    const p = {};
                                    parts.forEach(part => p[part.type] = part.value);
                                    cell.innerHTML = `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`;
                                }
                            },
                            { type: 'text', title: 'リンク', name: 'id', width: 100,
                                render: function(td, value) {
                                    const idFull = value.substring(4);
                                    const id = idFull.replaceAll(':','%3A');
                                    td.innerHTML = `<a href="http://arcs-vtex.corp.vtex.local/ArcSuite/docspace/sdk/open.do?enc=UTF-8&id=${id}" target="_blank">属性変更</a>`;
                                } // Generate link based on ID, open in new tab
                            },
                            { type: 'text', title: '更新', width: 80,
                                render: function(td, value, x, y, instance) {
                                    const btn = document.createElement('button');
                                    btn.innerHTML = '更新';
                                    btn.className = 'reload-btn';
                                    btn.onclick = async () => {
                                        const id = instance.getValueFromCoords(14, y); // Assuming 'id' is in the 14th column (index 13)
                                        await reloadSpecificRow(id, y, instance);
                                    }
                                    td.appendChild(btn);
                                }
                            }
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
                    break;
            }
        } else {
            alert("Search Failed: " + result.error);
        }
        document.getElementById('startDate').disabled = true;
        document.getElementById('endDate').disabled = true;
        document.getElementById('userSelect').disabled = true;
        document.getElementById('regionSelect').disabled = true;
        document.getElementById('roleSelect').disabled = true;
        document.getElementById('periodSelect').disabled = true;
    } catch (error) {
        console.error("Error during search:", error);
        alert("An error occurred: " + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }

}

async function reloadSpecificRow(recordId, rowNumber, instance) {
    try {
        // 1. Get the ID or unique identifier from the current row
        // Assuming 'id' is in a specific column, or get all row data
        //const rowData = instance.getRowData(rowNumber);

        // 2. Request updated data from the backend via Electron bridge
        // You might need to create a new listener in main.js for 'single-search'
        const result = await window.electronAPI.search({ id: recordId }, 'byId'); // Pass type to distinguish search context

        if (result.success && result.data) {
            // 3. Update the specific row with the new data object
            // instance refers to the worksheet
            instance.setRowData(rowNumber, result.data[0]); 
            console.log(`Row ${rowNumber} updated successfully.`);
        } else {
            alert("Update failed: " + result.error);
        }
    } catch (error) {
        console.error("Error reloading row:", error);
    }
}

function deleteContent() {
    document.getElementById('spreadsheet').innerHTML = ''
    $("#startDate").val("");
    $("#endDate").val("");
    $("#endDate").prop("disabled", false);
    $("#startDate").prop("disabled", false);
    $("#startDate").datepicker("option", "maxDate", null);
    $("#startDate").datepicker("option", "minDate", null);
    $("#endDate").datepicker("option", "maxDate", null);
    $("#endDate").datepicker("option", "minDate", null);
    document.getElementById('userSelect').disabled = false;
    document.getElementById('regionSelect').disabled = false;
    document.getElementById('roleSelect').disabled = false;
    document.getElementById('periodSelect').disabled = false;
}

// Attach to button after DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('search_button');
    if (btn) btn.addEventListener('click', docSearch);
    const deleteBtn = document.getElementById('delete_button');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteContent);
});

