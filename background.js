/**
 * Created by MartinZhao on 15/4/24.
 */
var obj = null;
var currentTab = null; // page tab container
var currPage = 0;
var pageCount = 0;
var currRow = 0;
var totalPageRow = 50;
var currentBukknId = 0;
var currentInfo = {};
var outputCSV = false;
var downloadPdf = true;
var downloadImg = true;

var isset = function(data) {
    if (data === "" || data === null ||  typeof data === "undefined") {
        return false;
    } else {
        return true;
    }
};
chrome.tabs.onUpdated.addListener(checkForValidUrl);
function checkForValidUrl(tabId, changeInfo, tab) {
    if (tab.url.indexOf('https://system.reins.jp') == 0) {
        chrome.pageAction.show(tabId);
    }
}

function setPageCount(obj) {
    pageCount = obj.find("table.outerTable:first tbody td:first a");
    pageCount = pageCount.length - 1;
    console.log("Total Page Count", pageCount);
}

window.onload = function () {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        currentTab = tabs[0];
        chrome.tabs.sendMessage(currentTab.id, {action_type: "get_dom"}, function (response) {
            obj = $(response.data);
            setPageCount(obj);
        });
    });
    if (downloadPdf || downloadImg) {
        chrome.downloads.onDeterminingFilename.addListener(function (item, suggest) {
            if (outputCSV) {
                outputCSV = false;
                return true;
            }
            if (currentBukknId == 0) {
                chrome.tabs.sendMessage(currentTab.id, {action_type: "get_dom"}, function (response) {
                    obj = $(response.data);
                    var row = obj.find("table.innerTable tbody tr").eq(currRow);
                    $(row).find("td.listTableColorA").each(function (index1, element1) {
                        if (index1 == 0) {
                            currentBukknId = $(element1).find("input[name=bkknBngu1]").val();
                        }
                    });
                });
            } else {
                var fileName = '';
                if (isPdfMimeType(item.mime)) {
                    fileName =  "reins/" + currentBukknId + "/" + item.filename;
                } else {
                    fileName = "reins/" + currentBukknId + "/" + getShortImgFileName(item.url);
                }
                suggest({
                    filename: fileName,
                    conflictAction: "overwrite"
                });
            }
        });
    }
    chrome.alarms.onAlarm.addListener(function (alarm) {

        chrome.tabs.sendMessage(currentTab.id, {action_type: "get_dom"}, function (response) {
            obj = $(response.data);
            var pageType = detectPageType();
            if (pageType == 1) {
                if (currRow > totalPageRow) {
                    chrome.tabs.sendMessage(currentTab.id, {action_type: "sim_scroll"}, function (response) {
                        // arrived last page, stop crawling.
                        if (currPage == pageCount) {
                            chrome.alarms.clear("doCrawl");
                            console.log("Stop Scrolling.");
                        }
                        currRow = 1;
                        currPage = response.currPage;
                        currPage = Number(currPage);
                        console.log("Start Crawling Page", currPage + 1);
                    });
                } else {
                    console.log("Crawling Row", currRow);
                    crawlMansionBasicInfo();
                    clickPdfButton(clickImageButton);
                }
            } else if (pageType == 2) {
                crawlMansionDetailInfo(clickBackButton);
            }
        });
    });


    document.getElementById("startButton").addEventListener("click", function () {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            currentTab = tabs[0];
            chrome.tabs.sendMessage(currentTab.id, {action_type: "get_dom"}, function (response) {
                obj = $(response.data);
                setPageCount(obj);
            });
        });
        currRow = $("#startRow").val();
        currRow = Number(currRow);
        currRow = currRow == 0 ? 1 : currRow;
        chrome.alarms.create("doCrawl", {
            periodInMinutes: 0.07
        });
    });

    document.getElementById("pauseButton").addEventListener("click", function () {
        chrome.alarms.clear("doCrawl");
    });

    document.getElementById("clearButton").addEventListener("click", function () {
        chrome.storage.local.clear();
    });

    document.getElementById("exportButton").addEventListener("click", function () {
        outputCSV = true;
        var header = 'data:application/csv;charset=UTF-8,';
        var exportCSV = "";

        chrome.storage.local.get(null, function (result) {
            var crawlType = $("#typeButton").val();
            crawlType = Number(crawlType);

            $.map(result, function (val, idx) {
                var row1 = "";
                switch (crawlType) {
                    case 1:
                        if (! exportCSV) {
                            exportCSV = "\"no\",\"toroku_ymd\",\"seiyaku_ymd\",\"prefecture\",\"loc1\",\"loc2\",\"name\",\"line1\",\"station1\",\"walk1\",\"line2\",\"station2\",\"walk2\",\"line3\",\"station3\",\"walk3\",\"price_ex\",\"price_now\",\"area\",\"layout_type1\",\"layout_room_num1\",\"floor_up\",\"floor_down\",\"floor_at\",\"builtYm\",\"balcony1\",\"balcony_area\",\"building_type\",\"area_usage_1\",\"area_usage_2\",\"area_right\",\"company\"\r\n";
                        }
                        row1 = '"' + val.bukknID + '","' + val.torokuYmd + '","' + val.seiyakuYmd + '","' + val.todofuken + '","' + val.syozai1 + '","' + val.syozai2 + '","' + val.tateme + '","' + val.line1 + '","' + val.eki1 + '","' + val.toho1 + '","' + val.line2 + '","' + val.eki2 + '","' + val.toho2 + '","' + val.line3 + '","' + val.eki3 + '","' + val.toho3 + '","' + val.preKakaku + '","' + val.kakaku + '","' + val.menseki + '","' + val.layout_1 + '","' + val.room_num_1 + '","' + val.upFloor + '","' + val.downFloor + '","' + val.kai + '","' + val.builtYm + '","' + val.balcony1 + '","' + val.balconyMenseki + '","' + val.buildingType + '","' + val.area_usage_1 + '","' + val.area_usage_2 + '","' + val.area_right + '","' + val.company + '"' + "\r\n";
                        break;
                    case 2:
                        if (! exportCSV) {
                            exportCSV = "\"no\",\"henkoYMD\",\"namae\",\"todofuken\",\"syozai1\",\"syozai2\",\"senro1\",\"eki1\",\"toho1\",\"senro2\",\"eki2\",\"toho2\",\"senro3\",\"eki3\",\"toho3\",\"maeKakaku\",\"menseki\",\"kai\",\"chikunen\",\"chikugetu\",\"balcony\"\r\n";
                        }
                        if (! val.henkoYmd) {
                            val.henkoYmd = val.torokuYmd;
                        }
                        row1 = '"' + val.bukknID + '","' + val.henkoYmd + '","' + val.tateme + '","' + val.todofuken + '","' + val.syozai1 + '","' + val.syozai2 + '","' + val.line1 + '","' + val.eki1 + '","' + val.toho1 + '","' + val.line2 + '","' + val.eki2 + '","' + val.toho2 + '","' + val.line3 + '","' + val.eki3 + '","' + val.toho3 + '","' + val.kakaku + '","' + val.menseki + '","' + val.kai + '","' + val.yearSeireki + '","' + val.month + '","' + val.balcony1 + '"' +  "\r\n";
                        break;
                    case 3:
                        if (! exportCSV) {
                            exportCSV = "\"no\",\"seiyakuYMD\",\"namae\",\"todofuken\",\"syozai1\",\"syozai2\",\"senro1\",\"eki1\",\"toho1\",\"senro2\",\"eki2\",\"toho2\",\"senro3\",\"eki3\",\"toho3\",\"kakaku\",\"maeKakaku\",\"reikin\",\"reikinNum\",\"sikikin\",\"sikikinNum\",\"menseki\",\"kanrihi\",\"kai\",\"chikunen\",\"chikugetu\",\"balcony\"\r\n";
                        }
                        row1 = '"' + val.bukknID + '","' + val.seiyakuYmd + '","' + val.tateme + '","' + val.todofuken + '","' + val.syozai1 + '","' + val.syozai2 + '","' + val.line1 + '","' + val.eki1 + '","' + val.toho1 + '","' + val.line2 + '","' + val.eki2 + '","' + val.toho2 + '","' + val.line3 + '","' + val.eki3 + '","' + val.toho3 + '","' + val.kakaku + '","' + val.preKakaku + '","' + val.reikin + '","' + val.reikinNum + '","' +  val.sikikin + '","' + val.sikikinNum + '","' + val.useMenseki + '","' + val.kanrihi + '","' + val.kai + '","' + val.yearSeireki + '","' + val.month + '","' + val.balcony1 + '"' + "\r\n";
                        break;
                    case 4:
                        if (! exportCSV) {
                            exportCSV = "\"no\",\"henkoYMD\",\"namae\",\"todofuken\",\"syozai1\",\"syozai2\",\"senro1\",\"eki1\",\"toho1\",\"senro2\",\"eki2\",\"toho2\",\"senro3\",\"eki3\",\"toho3\",\"maeKakaku\",\"reikin\",\"reikinNum\",\"sikikin\",\"sikikinNum\",\"menseki\",\"kanrihi\",\"kai\",\"chikunen\",\"chikugetu\",\"balcony\"\r\n";
                        }
                        if (! val.henkoYmd) {
                            val.henkoYmd = val.torokuYmd;
                        }
                        row1 = '"' + val.bukknID + '","' + val.henkoYmd + '","' + val.tateme + '","' + val.todofuken + '","' + val.syozai1 + '","' + val.syozai2 + '","' + val.line1 + '","' + val.eki1 + '","' + val.toho1 + '","' + val.line2 + '","' + val.eki2 + '","' + val.toho2 + '","' + val.line3 + '","' + val.eki3 + '","' + val.toho3 + '","' + val.kakaku + '","' + val.reikin + '","' + val.reikinNum + '","' +  val.sikikin + '","' + val.sikikinNum  + '","' + val.useMenseki + '","' + val.kanrihi + '","' + val.kai + '","' + val.yearSeireki + '","' + val.month + '","' + val.balcony1 + '"' + "\r\n";
                        break;
                }
                exportCSV += row1;
            });
            header = header + encodeURIComponent(exportCSV);
            var pom = document.createElement('a');
            pom.setAttribute('href', header);
            pom.setAttribute('download', 'export.csv');
            pom.style.display = 'none';
            document.body.appendChild(pom);
            pom.click();
            document.body.removeChild(pom);
        });
    });
};

// Detect if the page is search-result or image-result
function detectPageType() {
    var backBtn = obj.find("div[align='center'] input:image");
    if (backBtn && (backBtn[0].defaultValue.localeCompare("\u691c\u7d22\u7d50\u679c\u4e00\u89a7\u3078\u623b\u308b") == 0)) {
        return 2;
    } else {
        return 1;
    }
}

function crawlMansionBasicInfo() {
    var crawlType = $("#typeButton").val();
    crawlType = Number(crawlType);
    switch (crawlType) {
        case 1: crawlBasicSub1();break;
        case 2: crawlBasicSub2();break;
        case 3: crawlBasicSub3();break;
        case 4: crawlBasicSub4();break;
        default:
    }
}

function crawlMansionDetailInfo(callback) {
    var crawlType = $("#typeButton").val();
    crawlType = Number(crawlType);
    switch (crawlType) {
        case 1: crawlDetailSub1();break;
        case 2: crawlDetailSub2();break;
        case 3: crawlDetailSub3();break;
        case 4: crawlDetailSub4();break;
        default:
    }
    if (downloadImg) {
        obj.find("td.td_border_w input:image").each(function (idx, elem) {
            var bigImgSrc = $(elem).attr("onclick").split("'");
            var imgSrc = "https://system.reins.jp/reins/bkkn/KG010_001.do?filePath=" + bigImgSrc[1];
            chrome.downloads.download({
                url: imgSrc,
                filename: getShortImgFileName(bigImgSrc[1]),
                conflictAction: "overwrite"
            });
        });
    }
    storageMansionInfo();
    setTimeout(function () {
        callback();
    }, 100);
}

function getShortImgFileName(longFileName) {
    var split = longFileName.split("/");
    return split[split.length - 1]
}

function isPdfMimeType(mimeType) {
    return mimeType == 'application/octet-stream';
}

function storageMansionInfo() {
    if (currentInfo.length == 0 || typeof currentInfo.bukknID === "undefined") {
        console.warn("Failed to load item in page " + currPage + " row " + currRow);
        return false;
    }
    var bukknKey = currentInfo.bukknID;
    //if (isset(currentInfo.sikikin)) {
    //    currentInfo.sikikinNum = parseFloat(currentInfo.kakaku) * currentInfo.sikikin;
    //}
    //if (isset(currentInfo.reikin)) {
    //    currentInfo.reikinNum = parseFloat(currentInfo.kakaku) * currentInfo.reikin;
    //}
    Object.keys(currentInfo).forEach(function (key) {
        if (! isset(currentInfo[key])) {
            currentInfo[key] = "";
        }
    });
    console.log(currentInfo);
    var bukknVal = {};
    bukknVal[bukknKey] = currentInfo;
    chrome.storage.local.set(bukknVal, function () {
    });
    currentInfo = {};
    console.log("------------------------------------------");
    currRow++;
}

function clickBackButton() {
    var backBtn = obj.find("div[align='center'] input:image");
    backBtn = backBtn[0].outerHTML;
    chrome.tabs.sendMessage(currentTab.id, {action_type: "sim_click", click_what: backBtn}, function (response) {
    });
}

function clickPdfButton(callback) {
    if (downloadPdf) {
        var row = obj.find("table.innerTable tbody tr").eq(currRow);
        $(row).find('input:image').each(function () {
            var pdfElem = $(this).get(0);
            var inputValue = $(pdfElem).attr("onclick");
            if (typeof inputValue != "undefined" && inputValue.split("(")[0] == "openPdfPreview" ) {
                console.log("About to click pdf preview button");
                chrome.tabs.sendMessage(currentTab.id, {
                    action_type: "sim_click",
                    click_what: pdfElem.outerHTML
                }, function (response) {
                });
            }
        });
    }
     setTimeout(function () {
        callback();
    }, 100);
}

function clickImageButton() {
    var row = obj.find("table.innerTable tbody tr").eq(currRow);
    $(row).find('input:image').each(function () {
        var picElem = $(this).get(0);
        var inputValue = $(picElem).attr("onclick");
        if (typeof inputValue != "undefined" && inputValue.split("(")[0] == "setValue" ) {
            chrome.tabs.sendMessage(currentTab.id, {
                action_type: "sim_click",
                click_what: picElem.outerHTML
            }, function (response) {
            });
        }
    });
}

function crawlBasicSub1() {
    var row = obj.find("table.innerTable tbody tr").eq(currRow);
    $(row).find("td.listTableColorA").each(function (index1, element1) {
        if (index1 == 2) {
            // 物件ID
            var content = $(element1).html();
            content = content.split("<br>");
            for (var i in content) {
                content[i] = content[i].replace(/[\s\t\n\r]/g, '');
                content[i] = content[i].replace(/&nbsp;/gi, '');
            }
            currentInfo.bukknID = content[1];
            currentBukknId = content[1];
            console.log("Got Bukken ID " + currentBukknId + " in row " + currRow);
            content = null;
        } else if (index1 == 9) {
            // 築年月
            var content = $(element1).find("div").html();
            if (content) {
                content = content.split("<br>");
                currentInfo.builtYm = content[0].trim() + content[2].trim();
            } else {
                currentInfo.builtYm = ''
            }
            content = null;
        }
    });
}

function crawlBasicSub2() {
    var row = obj.find("table.innerTable tbody tr").eq(currRow);
    $(row).find("td.listTableColorA").each(function (index1, element1) {
        if (index1 == 2) {
            // 物件種目、番号、取引態様
            var content = $(element1).html();
            content = content.split("<br>");
            for (var i in content) {
                content[i] = content[i].replace(/[\s\t\n\r]/g, '');
                content[i] = content[i].replace(/&nbsp;/gi, '');
            }
            currentInfo.bukknID = content[1];
            currentBukknId = content[1];
            content = null;
        } else if (index1 == 4) {
            // 専有面積、単価、坪単価
            currentInfo.senyu = $(element1).find("div").html().split("<br>")[0].replace(/[\s\t\n\r]/g, '');
            $(element1).find("span.fontStyleItalic").each(function (index2, element2) {
                if (index2 == 0) {
                    currentInfo.tanka = $(element2).text();
                } else if (index2 == 1) {
                    currentInfo.tupoTan = $(element2).text();
                }
            })
        } else if (index1 == 9) {
            // 築年月
            content = $(element1).find("div").html();
            if (content) {
                content = content.split("<br>");
                currentInfo.yearSeireki = content[0].trim();
                currentInfo.month = content[2].trim();
            } else {
                currentInfo.yearSeireki = '';
                currentInfo.yearWareki = '';
                currentInfo.month = '';
            }

            content = null;
        }
    });
}

function crawlBasicSub3() {
    var row = obj.find("table.innerTable tbody tr").eq(currRow);
    $(row).find("td.listTableColorA").each(function (index1, element1) {
        if (index1 == 2) {
            // 物件ID
            content = $(element1).html();
            content = content.split("<br>");
            for (var i in content) {
                content[i] = content[i].replace(/[\s\t\n\r]/g, '');
                content[i] = content[i].replace(/&nbsp;/gi, '');
            }
            currentInfo.bukknID = content[1];
            currentBukknId = content[1];
            content = null;
        } else if (index1 == 9) {
            // 築年月
            var content = $(element1).find("div").html();
            if (content) {
                content = content.split("<br>");
                currentInfo.yearSeireki = content[0].trim();
                currentInfo.month = content[2].trim();
            } else {
                currentInfo.yearSeireki = '';
                currentInfo.month = '';
            }
            content = null;
        }
    });
}

function crawlBasicSub4() {
    var row = obj.find("table.innerTable tbody tr").eq(currRow);
    $(row).find("td.listTableColorA").each(function (index1, element1) {
        if (index1 == 2) {
            // 物件ID
            content = $(element1).html();
            content = content.split("<br>");
            for (var i in content) {
                content[i] = content[i].replace(/[\s\t\n\r]/g, '');
                content[i] = content[i].replace(/&nbsp;/gi, '');
            }
            // currentInfo.syumoku = content[0];
            // currentInfo.taiyou = content[2];
            currentInfo.bukknID = content[1];
            currentBukknId = content[1];
            content = null;
        } else if (index1 == 9) {
            // 築年月
            var content = $(element1).find("div").html();
            if (content) {
                content = content.split("<br>");
                currentInfo.yearSeireki = content[0].trim();
                currentInfo.month = content[2].trim();
            } else {
                currentInfo.yearSeireki = '';
                currentInfo.month = '';
            }
            content = null;
        }
    });
}

// 成約マンション、売買
function crawlDetailSub1() {
    if (currentInfo != {}) {
        // 登録年月日、変更年月日
        obj.find("td.tdWidthC").each(function (idx, elem) {
            var ymdText = $(elem).text();
            if (ymdText.localeCompare("\u6210\u7d04\u5e74\u6708\u65e5") == 0) {
                currentInfo.seiyakuYmd = $(elem).next("td").text().replace(/[\s\t\n\r]/g, '');
            } else if (ymdText.localeCompare("\u5909\u66f4\u5e74\u6708\u65e5") == 0) {
                currentInfo.henkoYmd = $(elem).next().text().replace(/[\s\t\n\r]/g, '');
            } else if (ymdText.localeCompare("\u767b\u9332\u5e74\u6708\u65e5") == 0) {
                currentInfo.torokuYmd = $(elem).next("td").text().replace(/[\s\t\n\r]/g, '');
            }
        });
        // 都道府県名、地名１、地名２

        obj.find("td.tdWidthA").each(function () {
            var tdText = $(this).text();
            if (tdText.localeCompare("\u5efa\u7269\u540d") == 0) {
                currentInfo.tateme = $(this).next("td").text();
            } else if (tdText.localeCompare("\u30d0\u30eb\u30b3\u30cb\u30fc\u65b9\u5411\uff11") == 0) {
                currentInfo.balcony1 = $(this).next("td").text();
            } else if (tdText.localeCompare("\u90fd\u9053\u5e9c\u770c\u540d") == 0) {
                currentInfo.todofuken = $(this).next("td").text();
            } else if (tdText.localeCompare("\u6240\u5728\u5730\u540d\uff11") == 0) {
                currentInfo.syozai1 = $(this).next("td").text();
            } else if (tdText.localeCompare("\u6240\u5728\u5730\u540d\uff12") == 0) {
                currentInfo.syozai2 = $(this).next("td").text();
            } else if (tdText.localeCompare("\u6cbf\u7dda\u540d") == 0) {
                var kTitle = $(this).parent().prev().find("td").text();
                var line = $(this).next("td").text();
                var eki = $(this).next("td").next("td").next("td").text();
                var toho = $(this).parent().next().find("td.tdWidthC").first().text();
                toho = parseInt(toho);
                if (toho && ! isNaN(toho)) {
                    if (kTitle.localeCompare("\u4ea4\u901a\uff11") == 0) {
                        currentInfo.line1 = (typeof line === "undefined") ? '' : line;
                        currentInfo.eki1 = (typeof line === "undefined") ? '' : eki;
                        currentInfo.toho1 = (typeof line === "undefined") ? '' : toho;
                    } else if (kTitle.localeCompare("\u4ea4\u901a\uff12") == 0) {
                        currentInfo.line2 = (typeof line === "undefined") ? '' : line;
                        currentInfo.eki2 = (typeof line === "undefined") ? '' : eki;
                        currentInfo.toho2 = (typeof line === "undefined") ? '' : toho;
                    } else if (kTitle.localeCompare("\u4ea4\u901a\uff13") == 0) {
                        currentInfo.line3 = (typeof line === "undefined") ? '' : line;
                        currentInfo.eki3 = (typeof line === "undefined") ? '' : eki;
                        currentInfo.toho3 = (typeof line === "undefined") ? '' : toho;
                    }
                }
            } else if (tdText.localeCompare("\u6210\u7d04\u4fa1\u683c") == 0) {
                currentInfo.kakaku = $(this).next("td").text();
            } else if (tdText.localeCompare("\u6210\u7d04\u524d\u4fa1\u683c") == 0) {
                currentInfo.preKakaku = $(this).next("td").text();
            } else if (tdText.localeCompare("\u5c02\u6709\u9762\u7a4d") == 0) {
                currentInfo.menseki = parseFloat($(this).next("td").text());
                currentInfo.balconyMenseki = parseFloat($(this).parent().next("tr").children("td").last().text());
            } else if (tdText.localeCompare("\u6240\u5728\u968e") == 0) {
                currentInfo.kai = parseInt($(this).next("td").text());
            } else if (tdText.localeCompare("\u5730\u4e0a\u968e\u5c64") == 0) {
                currentInfo.upFloor = parseInt($(this).next("td").text());
            } else if (tdText.localeCompare("\u5efa\u7269\u69cb\u9020") == 0) {
                currentInfo.buildingType = $(this).next("td").text();
            } else if (tdText.localeCompare("\u5730\u4e0b\u968e\u5c64") == 0) {
                var df = parseInt($(this).next("td").text());
                if (! isNaN(df)) {
                    currentInfo.downFloor = df;
                } else {
                    currentInfo.downFloor = 0;
                }
            } else if (tdText.localeCompare("\u9593\u53d6\u90e8\u5c4b\u6570") == 0) {
                var layoutTitle = $(this).closest("table").closest("tr").prev().text().trim();
                if (layoutTitle.localeCompare("\u9593\u53d6\uff11") == 0) {
                    currentInfo.layout_1 = $(this).prev("td").text();
                    currentInfo.room_num_1 = parseInt($(this).next("td").text());
                }
            } else if (tdText.localeCompare("\u7528\u9014\u5730\u57df\uff11") == 0) {
                currentInfo.area_usage_1 = $(this).next("td").text();
            } else if (tdText.localeCompare("\u7528\u9014\u5730\u57df\uff12") == 0) {
                currentInfo.area_usage_2 = $(this).next("td").text();
            } else if (tdText.localeCompare("\u571f\u5730\u6a29\u5229")   == 0) {
                currentInfo.area_right = $(this).next("td").text();
            } else if (tdText.localeCompare("\u7ba1\u7406\u4f1a\u793e\u540d")   == 0) {
                currentInfo.company = $(this).next("td").text();
            }
        });
    }
}
// 在庫マンション、売買
function crawlDetailSub2() {
    if (currentInfo != {}) {
        // 登録年月日、変更年月日
        obj.find("td.tdWidthC").each(function (idx, elem) {
            var ymdText = $(elem).text();
            if (ymdText.localeCompare("成約年月日") == 0) {
                currentInfo.seiyakuYmd = $(elem).next("td").text().replace(/[\s\t\n\r]/g, '');
            } else if (ymdText.localeCompare("変更年月日") == 0) {
                currentInfo.henkoYmd = $(elem).next().text().replace(/[\s\t\n\r]/g, '');
            } else if (ymdText.localeCompare("登録年月日") == 0) {
                currentInfo.torokuYmd = $(elem).next("td").text().replace(/[\s\t\n\r]/g, '');
            }
        });
        // 都道府県名、地名１、地名２

        obj.find("td.tdWidthA").each(function () {
            var tdText = $(this).text();
            if (tdText.localeCompare("建物名") == 0) {
                currentInfo.tateme = $(this).next("td").text();
            } else if (tdText.localeCompare("バルコニー方向１") == 0) {
                currentInfo.balcony1 = $(this).next("td").text();
            } else if (tdText.localeCompare("都道府県名") == 0) {
                currentInfo.todofuken = $(this).next("td").text();
            } else if (tdText.localeCompare("所在地名１") == 0) {
                currentInfo.syozai1 = $(this).next("td").text();
            } else if (tdText.localeCompare("所在地名２") == 0) {
                currentInfo.syozai2 = $(this).next("td").text();
            } else if (tdText.localeCompare("沿線名") == 0) {
                var kTitle = $(this).parent().prev().find("td").text();
                var line = $(this).next("td").text();
                var eki = $(this).next("td").next("td").next("td").text();
                var toho = $(this).parent().next().find("td.tdWidthC").first().text();
                toho = parseInt(toho);
                if (toho && ! isNaN(toho)) {
                    if (kTitle.localeCompare("交通１") == 0) {
                        currentInfo.line1 = line;
                        currentInfo.eki1 = eki;
                        currentInfo.toho1 = toho;
                    } else if (kTitle.localeCompare("交通２") == 0) {
                        currentInfo.line2 = line == undefined ? '' : line;
                        currentInfo.eki2 = eki == undefined ? '' : eki;
                        currentInfo.toho2 = toho == undefined ? '' : toho;
                    } else if (kTitle.localeCompare("交通３") == 0) {
                        currentInfo.line2 = line == undefined ? '' : line;
                        currentInfo.eki2 = eki == undefined ? '' : eki;
                        currentInfo.toho2 = toho == undefined ? '' : toho;
                    }
                }
            } else if (tdText.localeCompare("価格") == 0) {
                currentInfo.kakaku = $(this).next("td").text();
            } else if (tdText.localeCompare("専有面積") == 0) {
                currentInfo.menseki = $(this).next("td").text();
            } else if (tdText.localeCompare("所在階") == 0) {
                currentInfo.kai = parseInt($(this).next("td").text());
            }
        });
    }
}
// 成約マンション、賃貸
function crawlDetailSub3() {
    if (currentInfo != {}) {
        // 登録年月日、変更年月日
        obj.find("td.tdWidthC").each(function (idx, elem) {
            var ymdText = $(elem).text();
            if (ymdText.localeCompare("成約年月日") == 0) {
                currentInfo.seiyakuYmd = $(elem).next("td").text().replace(/[\s\t\n\r]/g, '');
            } else if (ymdText.localeCompare("変更年月日") == 0) {
                currentInfo.henkoYmd = $(elem).next().text().replace(/[\s\t\n\r]/g, '');
            } else if (ymdText.localeCompare("登録年月日") == 0) {
                currentInfo.torokuYmd = $(elem).next("td").text().replace(/[\s\t\n\r]/g, '');
            }
        });
        // 都道府県名、地名１、地名２

        obj.find("td.tdWidthA").each(function () {
            var tdText = $(this).text();
            if (tdText.localeCompare("建物名") == 0) {
                currentInfo.tateme = $(this).next("td").text();
            } else if (tdText.localeCompare("バルコニー方向１") == 0) {
                currentInfo.balcony1 = $(this).next("td").text();
            } else if (tdText.localeCompare("都道府県名") == 0) {
                currentInfo.todofuken = $(this).next("td").text();
            } else if (tdText.localeCompare("所在地名１") == 0) {
                currentInfo.syozai1 = $(this).next("td").text();
            } else if (tdText.localeCompare("所在地名２") == 0) {
                currentInfo.syozai2 = $(this).next("td").text();
            } else if (tdText.localeCompare("沿線名") == 0) {
                var kTitle = $(this).parent().prev().find("td").text();
                var line = $(this).next("td").text();
                var eki = $(this).next("td").next("td").next("td").text();
                var toho = $(this).parent().next().find("td.tdWidthC").first().text();
                toho = parseInt(toho);
                if (toho && ! isNaN(toho)) {
                    if (kTitle.localeCompare("交通１") == 0) {
                        currentInfo.line1 = line;
                        currentInfo.eki1 = eki;
                        currentInfo.toho1 = toho;
                    } else if (kTitle.localeCompare("交通２") == 0) {
                        currentInfo.line2 = line;
                        currentInfo.eki2 = eki;
                        currentInfo.toho2 = toho;
                    } else if (kTitle.localeCompare("交通３") == 0) {
                        currentInfo.line3 = line;
                        currentInfo.eki3 = eki;
                        currentInfo.toho3 = toho;
                    }
                }
            } else if (tdText.localeCompare("所在階") == 0) {
                currentInfo.kai = parseInt($(this).next("td").text());
            } else if (tdText.localeCompare("成約前賃料") == 0) {
                currentInfo.preKakaku = $(this).next("td").text();
            } else if (tdText.localeCompare("成約賃料") == 0) {
                currentInfo.kakaku = $(this).next("td").text();
            } else if (tdText.localeCompare("敷金") == 0) {
                currentInfo.sikikin = $(this).next("td").text();
                currentInfo.sikikin = parseInt(currentInfo.sikikin);
                if (isNaN(currentInfo.sikikin)) {
                    currentInfo.sikikin = 0;
                }
            } else if (tdText.localeCompare("礼金") == 0) {
                currentInfo.reikin = $(this).next("td").text();
                currentInfo.reikin = parseInt(currentInfo.reikin);
                if (isNaN(currentInfo.reikin)) {
                    currentInfo.reikin = 0;
                }
            } else if (tdText.localeCompare(" 使用部分面積") == 0) {
                currentInfo.useMenseki = $(this).next("td").text();
            } else if (tdText.localeCompare("管理費") == 0) {
                currentInfo.kanrihi = $(this).next("td").text();
                currentInfo.kanrihi = parseInt(currentInfo.kanrihi);
                if (isNaN(currentInfo.kanrihi)) {
                    currentInfo.kanrihi = 0;
                }
            }
        });
    }
}
// 在庫マンション、賃貸
function crawlDetailSub4() {
    if (currentInfo != {}) {
        // 登録年月日、変更年月日
        obj.find("td.tdWidthC").each(function (idx, elem) {
            var ymdText = $(elem).text();
            if (ymdText.localeCompare("成約年月日") == 0) {
                currentInfo.seiyakuYmd = $(elem).next("td").text().replace(/[\s\t\n\r]/g, '');
            } else if (ymdText.localeCompare("変更年月日") == 0) {
                currentInfo.henkoYmd = $(elem).next().text().replace(/[\s\t\n\r]/g, '');
            } else if (ymdText.localeCompare("登録年月日") == 0) {
                currentInfo.torokuYmd = $(elem).next("td").text().replace(/[\s\t\n\r]/g, '');
            }
        });
        // 都道府県名、地名１、地名２

        obj.find("td.tdWidthA").each(function () {
            var tdText = $(this).text();
            if (tdText.localeCompare("建物名") == 0) {
                currentInfo.tateme = $(this).next("td").text();
            } else if (tdText.localeCompare("バルコニー方向１") == 0) {
                currentInfo.balcony1 = $(this).next("td").text();
            } else if (tdText.localeCompare("都道府県名") == 0) {
                currentInfo.todofuken = $(this).next("td").text();
            } else if (tdText.localeCompare("所在地名１") == 0) {
                currentInfo.syozai1 = $(this).next("td").text();
            } else if (tdText.localeCompare("所在地名２") == 0) {
                currentInfo.syozai2 = $(this).next("td").text();
            } else if (tdText.localeCompare("沿線名") == 0) {
                var kTitle = $(this).parent().prev().find("td").text();
                var line = $(this).next("td").text();
                var eki = $(this).next("td").next("td").next("td").text();
                var toho = $(this).parent().next().find("td.tdWidthC").first().text();
                toho = parseInt(toho);
                if (toho && ! isNaN(toho)) {
                    if (kTitle.localeCompare("交通１") == 0) {
                        currentInfo.line1 = line;
                        currentInfo.eki1 = eki;
                        currentInfo.toho1 = toho;
                    } else if (kTitle.localeCompare("交通２") == 0) {
                        currentInfo.line2 = line;
                        currentInfo.eki2 = eki;
                        currentInfo.toho2 = toho;
                    } else if (kTitle.localeCompare("交通３") == 0) {
                        currentInfo.line3 = line;
                        currentInfo.eki3 = eki;
                        currentInfo.toho3 = toho;
                    }
                }
            } else if (tdText.localeCompare("所在階") == 0) {
                currentInfo.kai = parseInt($(this).next("td").text());
            } else if (tdText.localeCompare("賃料") == 0) {
                currentInfo.kakaku = $(this).next("td").text();
            } else if (tdText.localeCompare("敷金") == 0) {
                currentInfo.sikikin = $(this).next("td").text();
                currentInfo.sikikin = parseInt(currentInfo.sikikin);
                if (isNaN(currentInfo.sikikin)) {
                    currentInfo.sikikin = 0;
                }
            } else if (tdText.localeCompare("礼金") == 0) {
                currentInfo.reikin = $(this).next("td").text();
                currentInfo.reikin = parseInt(currentInfo.reikin);
                if (isNaN(currentInfo.reikin)) {
                    currentInfo.reikin = 0;
                }
            } else if (tdText.localeCompare(" 使用部分面積") == 0) {
                currentInfo.useMenseki = $(this).next("td").text();
            } else if (tdText.localeCompare("管理費") == 0) {
                currentInfo.kanrihi = $(this).next("td").text();
                currentInfo.kanrihi = parseInt(currentInfo.kanrihi);
                if (isNaN(currentInfo.kanrihi)) {
                    currentInfo.kanrihi = 0;
                }
            }
        });
    }
}
