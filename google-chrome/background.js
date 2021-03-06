var htmlvalidatorbackground = function () {

    var validatorDomain = "validator.tq.24hr.se";

    var init = function () {
        chrome.browserAction.onClicked.addListener(function (tab) {
            validate();
        });

        chrome.runtime.onMessage.addListener(
            function (request, sender, sendResponse) {
                if (request.validate) {
                    validate(request.validation);
                }
                else if (request.setBadgeValues) {
                    formatBadge(request.errors);
                }
                else if (request.autoruncheck) {
                    var autorun = getPref("autorun") || "true";
                    if (typeof autorun !== "undefined" && autorun === "true") {
                        validate();
                    }
                }
                else if (request.validateLocal) {
                    validate("validate-local-inline", request.html);
                }
                else if (request.openNewTabForForm) {
                    chrome.tabs.create({
                        "url" : request.url
                    }, function (tab) {
                        chrome.tabs.executeScript(
                            tab.id,
                            {
                                "code" : "htmlvalidator.postForm()"
                            }
                        );
                    });
                }
            }
        );
    },

    formatBadge = function (errors) {
        chrome.tabs.getSelected(null, function (tab) {
            var tabId = tab.id;
            chrome.browserAction.setBadgeText({
                text : errors.toString(),
                tabId : tabId
            });

            chrome.browserAction.setBadgeBackgroundColor({
                color : (errors > 0 || errors === "X")? [210, 61, 36, 255] : [85, 176, 90, 255],
                tabId : tabId
            });
        });
    },

    validate = function (validation, html) {
        chrome.tabs.getSelected(null, function (tab) {
            var validatorType = validation || getPref("validator") || "inline",
                autorun = getPref("autorun") || "true",
                usetimeout = getPref("usetimeout") || "true",
                loadingindicator = getPref("loadingindicator") || "false",
                tabUrl = tab.url.replace(/#[^\?]+/, ""); // Replace hash for bookmarks since it throws the validator

            if (validatorType === "inline" && (!(/(validator\.nu|validator\.w3\.org)/.test(tabUrl)) && autorun)) { // To avoid inline validation of the W3C validator

                // To clear possible previous ongoing validation attempts
                clearTimeout(timer);
                clearTimeout(loadingTimer);

                var url = getPref("validatorurl") + "/check?uri=" + encodeURIComponent(tabUrl) + "&output=json",
                    xhr = new XMLHttpRequest(),
                    xhrAborted = false,
                    timer,
                    loadingTimer,
                    sendResults = function (result) {
                        clearTimeout(loadingTimer);
                        chrome.tabs.sendMessage(
                            tab.id,
                            {
                                results : result,
                                showErrorList : getPref("errorlist") || "showerrorlistatclick"
                            }
                        );
                    };

                // Hides any possible validating loading indicator
                sendResults({
                    "message" : "hide-loading"
                });

                // Timeut for validation AJAX requests
                if (usetimeout === "true") {
                    timer = window.setTimeout(function () {
                        xhr.abort();
                        sendResults({
                            "message" : "Validation timed out. Please try again or <a href=\"" + getPref("validatorurl") + "/check?uri=" + encodeURIComponent(tabUrl) + "\" target=\"_blank\">validate this page at W3C</a>"
                        });
                    }, 5000);
                }

                // If the result is finished, send validation results to the page
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        clearTimeout(timer);
                        //console.log(xhr.getResponseHeader("X-W3C-Validator-Status"));
                        var status = xhr.getResponseHeader("X-W3C-Validator-Status");
                        if (!status || status === "Abort") {
                            sendResults({
                                "message" : "validate-local-html",
                                "inline" : true
                            });
                        }
                        else {
                            formatBadge(xhr.getResponseHeader("X-W3C-Validator-Errors"));
                            sendResults(xhr.responseText);
                        }
                    }
                };

                // If an error occurs
                xhr.onerror = function () {
                    clearTimeout(timer);
                    sendResults({
                        "message" : "Validation failed. Please try again."
                    });
                };

                // Show validating loading
                if (loadingindicator === "true") {
                    loadingTimer = window.setTimeout(function () {
                        sendResults({
                            "message" : "show-loading"
                        });
                    }, 200);
                }

                // Send validation request to W3C
                xhr.open("GET", url, true);
                xhr.send(null);
            }
            else if (validatorType === "validate-local-inline") {
                chrome.tabs.sendMessage(
                    tab.id,
                    {
                        results : {
                            "message" : "hide-message"
                        }
                    }
                );
                var xhrInline = new XMLHttpRequest(),
                    params = "output=json&fragment=" + encodeURIComponent(html);

                xhrInline.onreadystatechange = function () {
                    if (xhrInline.readyState === 4) {
                        var status = xhrInline.getResponseHeader("X-W3C-Validator-Status"),
                            response;
                        if (!status || status === "Abort") {
                            formatBadge("X");
                            chrome.tabs.sendMessage(
                                tab.id,
                                {
                                    results : {
                                        "message" : "Validation failed. Please retry or wait till<br> W3C allows validation again"
                                    }
                                }
                            );
                        }
                        else {
                            response = xhrInline.responseText;
                            if (/For security reasons, validating resources located at non-public IP addresses has been disabled in this service/i.test/(response)) {
                                chrome.tabs.sendMessage(
                                    tab.id,
                                    {
                                        results : {
                                            "message" : "For security reasons, validating resources located at non-public IP addresses has been disabled in this service - W3C"
                                        }
                                    }
                                );
                            }
                            else {
                                formatBadge(xhrInline.getResponseHeader("X-W3C-Validator-Errors"));
                                chrome.tabs.sendMessage(
                                    tab.id,
                                    {
                                        results : xhrInline.responseText,
                                        showErrorList : getPref("errorlist") || "showerrorlistatclick"
                                    }
                                );
                            }
                        }
                    }
                };
                xhrInline.open("POST", getPref("validatorurl") + "/check", true);
                xhrInline.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                xhrInline.send(params);
            }
            else if (validatorType === "new-tab" && tabUrl.indexOf(getPref("validatorurl")) == -1 ) { // URL check to avoid validating the W3C validator... :-)
                chrome.tabs.create({
                    url : getPref("validatorurl") + "/check?uri=" + encodeURIComponent(tabUrl)
                });
            }
            else if (validatorType === "validate-local-html") {
                chrome.tabs.sendMessage(
                    tab.id,
                    {
                        results : {
                            "message" : "validate-local-html"
                        }
                    }
                );
            }
        });
    },

    createErrorList = function () {
        sendMessage("create-error-list");
    },

    hideResultsPresentation = function () {
        sendMessage("hide-error-list");
    },

    sendMessage = function (message) {
        chrome.tabs.getSelected(null, function (tab) {
            chrome.tabs.sendMessage(
                tab.id,
                {
                    results : {
                        "message" : message
                    }
                }
            );
        });
    },

    getPref = function (pref) {
        return localStorage[pref];
    },

    getPrefs = function () {
        return {
            autorun : localStorage["autorun"],
            validator : localStorage["validator"],
            errorlist : localStorage["errorlist"],
            iconclick : localStorage["iconclick"],
            usetimeout : localStorage["usetimeout"],
            loadingindicator : localStorage["loadingindicator"],
            validatorurl : localStorage["validatorurl"]
        };
    },

    setPref = function (pref, value) {
        return localStorage[pref] = value;
    },

    setPrefs = function (prefs) {
        for (var i in prefs) {
            localStorage[i] = prefs[i];
        }
    };

    return {
        init : init,
        validate : validate,
        createErrorList : createErrorList,
        hideResultsPresentation : hideResultsPresentation,
        getPref : getPref,
        getPrefs : getPrefs,
        setPref : setPref,
        setPrefs : setPrefs
    };
}();
htmlvalidatorbackground.init();
