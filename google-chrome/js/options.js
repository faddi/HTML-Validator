var htmlvalidatoroptions = function () {
    // Base variables
    var backgroundPage = chrome.extension.getBackgroundPage().htmlvalidatorbackground,
        prefs = backgroundPage.getPrefs(),
        autorun,
        validator,
        errorlist,
        iconclick,
        validatorurl,
        defaults = {
            autorun : "true",
            validator : "inline",
            errorlist : "showerrorlist",
            iconclick : "icondontvalidate",
            usetimeout : "true",
            loadingindicator : "false",
            validatorurl : "http://validator.w3.org"
        },
        item,
        pref,

        init = function () {
            autorun = document.getElementById("autorun");
            validator = document.getElementsByName("validator");
            errorlist = document.getElementsByName("errorlist");
            iconclick = document.getElementsByName("iconclick");
            usetimeout = document.getElementById("usetimeout");
            loadingindicator = document.getElementById("loadingindicator");
            validatorurl = document.getElementById("validatorurl");

            // Getting values from preferences
            for (var item in prefs) {
                pref = prefs[item];
                if (typeof pref === "undefined") {
                    pref = defaults[item];
                    backgroundPage.setPref(item, pref);
                }
                if (item === "validator" || item === "errorlist" || item === "iconclick") {
                    document.getElementById(pref).checked = true;
                } else if (item === "validatorurl"){
                    validatorurl.value = pref;
                } else {
                    document.getElementById(item).checked = (pref === "true");
                }
            }

            // Event to set preferences instantaneously
            document.onclick = function () {
                var validatorValue = "inline",
                    validatorItem,
                    errorlistValue = "showerrorlist",
                    errorlistItem,
                    iconclickValue = "validate",
                    iconclickItem;
                for (var i=0, il=validator.length; i<il; i++) {
                    validatorItem = validator[i];
                    if (validatorItem.checked) {
                        validatorValue = validatorItem.value;
                        break;
                    }
                };

                for (var j=0, jl=errorlist.length; j<jl; j++) {
                    errorlistItem = errorlist[j];
                    if (errorlistItem.checked) {
                        errorlistValue = errorlistItem.value;
                        break;
                    }
                };

                for (var k=0, kl=iconclick.length; k<kl; k++) {
                    iconclickItem = iconclick[k];
                    if (iconclickItem.checked) {
                        iconclickValue = iconclickItem.value;
                        break;
                    }
                };

                // Save preferences
                backgroundPage.setPrefs({
                    autorun : autorun.checked,
                    validator : validatorValue,
                    errorlist : errorlistValue,
                    iconclick : iconclickValue,
                    usetimeout : usetimeout.checked,
                    loadingindicator : loadingindicator.checked,
                    validatorurl : validatorurl.value
                });
            };
        };

    return {
        init : init
    };
}();

window.onload = function () {
    htmlvalidatoroptions.init();
};
