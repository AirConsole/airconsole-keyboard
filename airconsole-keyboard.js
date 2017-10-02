function AirConsoleKeyboard(keyboard_id, opts) {
  var me = this;
  if (!opts) {
    opts = {};
  }
  opts.layouts = opts.layouts || AirConsoleKeyboard.DEFAULT_KEYBOARD;

  me.container = document.getElementById(keyboard_id);
  me.container.className += " airconsole-keyboard";
  me.container.addEventListener("click", function(event) {
    event.stopPropagation();
    event.preventDefault();
  });

  if (!opts.prevent_body_click) {
    document.body.addEventListener("click", function() {
      me.hide();
    }, false);
  }

  me.layouts = [];
  me.keys = [];
  for (var i = 0; i < opts.layouts.length; ++i) {
    var rows = opts.layouts[i];
    var layout = document.createElement("div");
    layout.className = "airconsole-keyboard-layout";
    for (var r = 0; r < rows.length; ++r) {
      var keys = rows[r];
      var row = document.createElement("div");
      row.className = "airconsole-keyboard-row";
      for (var k = 0; k < keys.length; ++k) {
        var width = 100/keys.length;
        while (k + 1 < keys.length && me.keysEqual_(keys[k], keys[k+1])) {
          width += 100/keys.length;
          k++;
        }
        row.appendChild(me.createKey_(keys[k], width));
      }
      layout.appendChild(row);
    }
    if (i) {
      layout.style.display = "none";
    }
    me.layouts.push(layout);
    me.container.appendChild(layout);
    me.values = {};
    me.placeholders = {};
    me.carret = document.createElement("span");
    me.carret.className = "airconsole-keyboard-carret-container";
    me.carret.innerHTML = "&nbsp";
    var carret = document.createElement("div");
    carret.className = "airconsole-keyboard-carret";
    me.carret.appendChild(carret);
  }
}

AirConsoleKeyboard.DONE = 1;
AirConsoleKeyboard.HIDE = 2;
AirConsoleKeyboard.BACKSPACE = 3;
AirConsoleKeyboard.CANCEL = 4;

AirConsoleKeyboard.prototype.bind = function(input_id, opts) {
  var me = this;
  var input_div = document.getElementById(input_id);
  input_div.addEventListener("click", function(event) {
    me.show(input_id, opts);
    event.stopPropagation();
    event.preventDefault();
  });
  if (!input_div.innerHTML) {
    input_div.innerHTML = "&nbsp;"
  }
  input_div.style.mozUserSelect = "none";
  input_div.style.webkitUserSelect = "none";
  input_div.style.msUserSelect = "none";
  input_div.style.userSelect = "none";
};

AirConsoleKeyboard.prototype.valueText = function(input_id) {
  var textarea = document.createElement("textarea");
  textarea.innerHTML = this.valueHTML(input_id);
  return textarea.value;

};

AirConsoleKeyboard.prototype.valueHTML = function(input_id) {
  if (this.values[input_id]) {
    return this.values[input_id].join("");
  }
  return "";
};

AirConsoleKeyboard.prototype.setValue = function(input_id, value) {
  this.removePlaceholder_(input_id);
  if (this.active_input_id == input_id) {
    this.removeCarret_();
  }
  var input_div = document.getElementById(input_id);
  while (input_div.childNodes.length) {
    input_div.removeChild(input_div.childNodes[0]);
  }
  var tmp = document.createElement("div");
  tmp.innerHTML = value;
  this.values[input_id] = [];
  var child_nodes = tmp.childNodes;
  for (var i = child_nodes.length - 1; i >= 0; --i) {
    var node = child_nodes[i];
    if (node.nodeType == 3) { // Text
      for (var c = node.nodeValue.length - 1; c >= 0; --c) {
        this.addKey_(input_id, 0, "&#" + node.nodeValue.charCodeAt(c) + ";");
      }
    } else {
      var tmp2 = document.createElement("div");
      node.parentNode.removeChild(node);
      tmp2.appendChild(node);
      this.addKey_(input_id, 0, tmp2.innerHTML);
    }
  }
  if (this.active_input_id == input_id) {
    this.setCarret();
  } else if (!value) {
    this.addPlaceholder_(input_id)
  }
}

AirConsoleKeyboard.prototype.switchLayout = function(layout) {
  for (var k = 0; k < this.layouts.length; ++k) {
    this.layouts[k].style.display = (k == layout ? "inline-block" : "none");
  }
};

AirConsoleKeyboard.prototype.show = function(input_id, opts) {
  if (input_id == this.active_input_id) {
    this.setCarret();
    return;
  } else if (this.active_input_id) {
    this.addPlaceholder_(this.active_input_id);
  }
  opts = opts || {};
  this.switchLayout(opts.layout || 0);
  this.active_input_id = input_id;
  this.active_input_div = document.getElementById(input_id);
  this.active_opts = opts;
  this.container.style.display = "block";
  this.removePlaceholder_(input_id);
  this.setCarret();
  if (opts.onShow) {
    opts.onShow(input_id);
  }
};

AirConsoleKeyboard.prototype.softHide = function() {
  this.container.style.display = "none";
  this.removeCarret_();
  this.active_input_id = undefined;
  this.active_input_div = undefined;
};

AirConsoleKeyboard.prototype.hide = function() {
  if (!this.active_input_id) {
    return;
  }

  this.container.style.display = "none";
  this.removeCarret_();
  this.addPlaceholder_(this.active_input_id);
  if (this.active_opts.onHide) {
    this.active_opts.onHide(this.active_input_id,
                            this.valueText(this.active_input_id),
                            this.valueHTML(this.active_input_id));
  }
  this.active_input_id = undefined;
  this.active_input_div = undefined;
}

AirConsoleKeyboard.prototype.setCarret = function(position) {
  var me = this;
  me.removeCarret_();
  var child_nodes = this.active_input_div.childNodes;
  if (position === undefined) {
    position = child_nodes.length;
  }
  position = Math.min(position, child_nodes.length);
  position = Math.max(position, 0);
  this.carret.style.opacity = 0;
  var blink = 0;
  this.carret_interval = window.setInterval(function() {
    blink++;
    me.carret.style.opacity = blink % 2;
  }, 500);
  me.insert_pos = position;
  var count = 0;
  for (var i = 0; i < child_nodes.length; ++i) {
    if (child_nodes[i] != this.carret) {
      count++;
      if (count == position + 1) {
        this.active_input_div.insertBefore(this.carret,
                                           child_nodes[i]);
        break
      }
    }
  }
  if (!this.carret.parentNode) {
    me.active_input_div.appendChild(this.carret);
  }
  window.setTimeout(function() {
    me.carret.style.marginLeft = Math.ceil(1-me.carret.offsetWidth / 2) + "px"
    me.carret.style.marginRight = Math.floor(-me.carret.offsetWidth / 2) + "px"
  });
  me.disableKeys();
}

AirConsoleKeyboard.defaultKeyboard = function(done_label, done_class_name) {
  var done = { action: AirConsoleKeyboard.DONE };
  if (done_label === undefined && done_class_name == undefined) {
    done.label = "Done"
  }
  if (done_label) {
    done.label = done_label;
  }
  if (done_class_name) {
    done.className = done_class_name
  }

  var backspace = {
    action: AirConsoleKeyboard.BACKSPACE,
    label: "&nbsp;",
    className: "airconsole-keyboard-backspace"
  };

  var shift_key = {
    layout: 1,
    label: "&nbsp;",
    className: "airconsole-keyboard-shift"
  };
  var shift_key_active = {
    layout: 0,
    label: "&nbsp;",
    className: "airconsole-keyboard-layout-key-active airconsole-keyboard-shift"
  };

  return [
    [
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l", "."],
      [shift_key, "z", "x", "c", "v", "b", "n", "m",
        backspace, backspace],
      [{action: AirConsoleKeyboard.HIDE, label: "Hide"},
        "&nbsp;", "&nbsp;", {layout: 2, label: "#123"},
        done]
    ], [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", ","],
      [shift_key_active, "Z", "X", "C", "V", "B", "N", "M",
        backspace, backspace],
      [{action: AirConsoleKeyboard.HIDE, label: "Hide"},
        "&nbsp;", "&nbsp;", {layout: 2, label: "#123"}, done]
    ], [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["@", "#", "$", "'", "\"", "&amp;", "(", ")", "-", "_"],
      [{layout: 3, label: "{[&deg;&euro;"},
        {layout: 3, label: "{[&deg;&euro;"},
        "!", "+", "=", "?", ":", ";",
        {layout: 4, label: "&auml;&eacute;&oslash;"},
        {layout: 4, label: "&auml;&eacute;&oslash;"}],
      [{action: AirConsoleKeyboard.HIDE, label: "Hide"},
        "&nbsp;", "&nbsp;", {layout: 0, label: "#123",
          className: "airconsole-keyboard-layout-key-active"},
        done]
    ], [
      ["&pound;", "&euro;", "&yen;", "&cent;", "&copy;", "&reg;", "&trade;"],
      ["[", "]", "{", "}", "&lt;", "&gt;", "^"],
      ["~", "&iquest", "\\", "&iexcl;", "&deg;", "&sect;", "&para;"],
      [{action: AirConsoleKeyboard.HIDE, label: "Hide"},
        "&nbsp;", "&nbsp;", {layout: 0, label: "{[&deg;&euro;",
          className: "airconsole-keyboard-layout-key-active"},
        done]
    ], [
      [ "&aacute;", "&agrave;", "&acirc;", "&aring;", "&atilde;", "&auml;",
        "&aelig;", "&ccedil;", "&eacute;", "&egrave;"],
      [ "&ecirc;", "&euml;", "&iacute;", "&igrave;", "&icirc;", "&iuml;",
        "&ntilde;", "&oacute;", "&ograve;", "&ocirc;"],
      [ {layout: 5, label: "&#x21E7;"}, "&oslash;", "&otilde;", "&ouml;",
        "&szlig;", "&uacute;", "&ugrave;", "&ucirc;", "&uuml;", "&yuml"],
      [{action: AirConsoleKeyboard.HIDE, label: "Hide"}, "&nbsp;",
        "&nbsp;", { layout: 0, label: "&auml;&eacute;&oslash;",
          className: "airconsole-keyboard-layout-key-active"},
        done]
    ], [
      [ "&Aacute;", "&Agrave;", "&Acirc;", "&Aring;", "&Atilde;", "&Auml;",
        "&AElig;", "&Ccedil;", "&Eacute;", "&Egrave;"],
      [ "&Ecirc;", "&Euml;", "&Iacute;", "&Igrave;", "&Icirc;", "&Iuml;",
        "&Ntilde;", "&Oacute;", "&Ograve;", "&Ocirc;"],
      [ {layout: 4, label: "&#x21E7;",
        className: "airconsole-keyboard-layout-key-active"},
        "&Oslash;", "&Otilde;", "&Ouml;", "&szlig;",
        "&Uacute;", "&Ugrave;", "&Ucirc;", "&Uuml;", "&yuml"],
      [{action: AirConsoleKeyboard.HIDE, label: "Hide"}, "&nbsp;",
        "&nbsp;", { layout: 0, label: "&auml;&eacute;&oslash;",
          className: "airconsole-keyboard-layout-key-active"},
        done
    ]
  ]];
}

AirConsoleKeyboard.DEFAULT_KEYBOARD = AirConsoleKeyboard.defaultKeyboard();


/* Only private functions bellow */

AirConsoleKeyboard.prototype.disableKeys = function() {
  if (this.active_opts.keyDisabled) {
    var before_html = "";
    var after_html = "";
    var values = this.values[this.active_input_id];
    for (var i = 0; i < values.length; ++i) {
      if (i < this.insert_pos) {
        before_html += values[i];
      } else {
        after_html += values[i];
      }
    }
    for (var i = 0; i < this.keys.length; ++i) {
      var key = this.keys[i];
      if (this.active_opts.keyDisabled(key, before_html, after_html)) {
        if (key.container.className.indexOf(
            "airconsole-keyboard-key-disabled") == -1) {
          key.container.className += " airconsole-keyboard-key-disabled"
        }
      } else {
        key.container.className = key.container.className.replace(
            / airconsole\-keyboard\-key\-disabled/g, "");
      }
    }
  }
}

AirConsoleKeyboard.prototype.removePlaceholder_ = function(input_id) {
  var input_div = document.getElementById(input_id);
  if (!this.valueText(input_id).length) {
    this.values[input_id] = [];
    this.placeholders[input_id] = [];
    while(input_div.childNodes.length) {
      this.placeholders[input_id].push(input_div.childNodes[0]);
      input_div.removeChild(input_div.childNodes[0]);
    }
  }
};

AirConsoleKeyboard.prototype.addPlaceholder_ = function(input_id) {
  if (!this.valueText(input_id).length && this.placeholders[input_id]) {
    var input_div = document.getElementById(input_id);
    delete this.values[input_id];
    for (var i = 0; i < this.placeholders[input_id].length; ++i) {
      input_div.appendChild(this.placeholders[input_id][i]);
    }
    delete this.placeholders[input_id];
  }
}

AirConsoleKeyboard.prototype.removeCarret_ = function() {
  if (this.carret_interval) {
    window.clearInterval(this.carret_interval);
    this.carret_interval = null;
    if (this.carret.parentNode) {
      this.carret.parentNode.removeChild(this.carret);
    }
  }
}

AirConsoleKeyboard.prototype.keysEqual_ = function(a, b) {
  a = this.convertKey_(a);
  b = this.convertKey_(b);
  return (a.label == b.label &&
          a.action == b.action &&
          a.className == b.className &&
          a.layout == b.layout)
}

AirConsoleKeyboard.prototype.convertKey_ = function(key) {
  if (typeof key == "string") {
    return {
      html: key,
      label: key
    }
  }
  return key;
}

AirConsoleKeyboard.prototype.createKey_ = function(key, percent_width) {
  var me = this;
  var key_container = document.createElement("div");
  key_container.className = "airconsole-keyboard-key";
  var key_label = document.createElement("div");
  key_label.className = "airconsole-keyboard-key-label";
  key = me.convertKey_(key)
  var key_html_container = document.createElement("div");
  key_html_container.className = "airconsole-keyboard-key-html-container";
  key_html_container.innerHTML = key.label;
  key_label.appendChild(key_html_container);
  if (key.className) {
    key_label.className += " " + key.className;
  }
  var event_name_down = "touchstart";
  var event_name_up = "touchend";
  var event_name_down_prevent = "mousedown";
  var event_name_up_prevent = "mouseup";
  if (!('ontouchstart' in document.documentElement)) {
    event_name_down = "mousedown";
    event_name_up = "mouseup";
    event_name_down_prevent = "touchstart";
    event_name_up_prevent = "touchend";
  }
  if (key.html !== undefined) {
    key_container.addEventListener(event_name_down, function(e) {
      if (key.container.className.indexOf(
          " airconsole-keyboard-key-disabled") == -1) {
        me.onKey_(key, key_label)
      }
      e.stopPropagation();
      e.preventDefault();
    });
  }
  if (key.action !== undefined) {
    var clear_all_timeout;
    if (key.action == AirConsoleKeyboard.BACKSPACE) {
      key_container.addEventListener(event_name_down, function(e) {
        if (key.container.className.indexOf(
                " airconsole-keyboard-key-disabled") == -1) {
          clear_all_timeout = window.setTimeout(function() {
            me.setValue(me.active_input_id, "")
          }, 500);
        }
        e.preventDefault();
      });
    }

    key_container.addEventListener(event_name_up, function(e) {
      if (key.container.className.indexOf(
          " airconsole-keyboard-key-disabled") == -1) {
        if (clear_all_timeout) {
          window.clearTimeout(clear_all_timeout);
          clear_all_timeout = null;
        }
        window.setTimeout(function() {
          me.onAction_(key.action, key_label);
        }, key.action == AirConsoleKeyboard.BACKSPACE ? 0 : 100);
      }
      e.stopPropagation();
      e.preventDefault();
    });
  }
  if (key.layout !== undefined) {
    key_container.addEventListener(event_name_down, function(e) {
      if (key.container.className.indexOf(
          " airconsole-keyboard-key-disabled") == -1) {
        me.switchLayout(key.layout)
      }
      e.stopPropagation();
      e.preventDefault();
    });
  }
  key_container.addEventListener(event_name_down_prevent, function(e) {
    e.stopPropagation();
    e.preventDefault();
  });
  key_container.addEventListener(event_name_up_prevent, function(e) {
    e.stopPropagation();
    e.preventDefault();
  });
  key_container.addEventListener("click", function(e) {
    e.stopPropagation();
    e.preventDefault();
  });
  key_container.addEventListener("dblclick", function(e) {
    e.stopPropagation();
    e.preventDefault();
  });
  key_container.appendChild(key_label);
  key_container.style.width = percent_width + "%";
  key.container = key_container;
  me.keys.push(key);
  return key_container;
}

AirConsoleKeyboard.prototype.spanToInsertPos_ = function(span) {
  var child_nodes = this.active_input_div.childNodes;
  var count = 0;
  for (var i = 0; i < child_nodes.length; ++i) {
    if (child_nodes[i] != this.carret) {
      count++;
    }
    if (child_nodes[i] == span) {
      return count;
    }
  }
  return count;
}

AirConsoleKeyboard.prototype.onAction_ = function(action, element) {
  var me = this;
  element.className += " airconsole-keyboard-key-label-active";
  window.setTimeout(function () {
    element.className = element.className.replace(
        / airconsole\-keyboard\-key\-label\-active/g, "");
  }, 100);
  if (action == AirConsoleKeyboard.DONE) {
    if (me.active_opts.onDone) {
      me.active_opts.onDone(me.active_input_id,
                              me.valueText(me.active_input_id),
                              me.valueHTML(me.active_input_id));
    }
    me.hide();
  } else if (action == AirConsoleKeyboard.HIDE) {
    me.hide();
  } else if (action == AirConsoleKeyboard.CANCEL) {
    me.setValue(me.active_input_id, "");
    if (me.active_opts.onCancel) {
      me.active_opts.onCancel(me.active_input_id);
    }
    me.hide();
  } else if (action == AirConsoleKeyboard.BACKSPACE) {
    if (me.insert_pos >= 1) {
      me.insert_pos--;
      me.values[me.active_input_id].splice(me.insert_pos, 1);
      me.active_input_div.removeChild(
          me.active_input_div.childNodes[me.insert_pos]);
      me.onChange_();
      me.disableKeys();
    }
  }
};

AirConsoleKeyboard.prototype.addKey_ = function(input_id, insert_pos, html) {
  var me = this;
  me.values[input_id].splice(insert_pos, 0, html);
  var span = document.createElement("span");
  span.innerHTML = html;
  span.addEventListener("click", function(event) {
    var position_offset = 0;
    if ((event.pageX - span.offsetLeft)/span.offsetWidth < 0.5) {
      position_offset -= 1;
    }
    window.setTimeout(function () {
      var position = me.spanToInsertPos_(span) + position_offset;
      me.setCarret(position);
    });
  })
  var input_div = document.getElementById(input_id)
  var child_nodes = input_div.childNodes;
  if (this.active_input_id != input_id) {
    if (!child_nodes[insert_pos]) {
      input_div.appendChild(span);
    } else {
      input_div.insertBefore(span, child_nodes[insert_pos]);
    }
  } else if (insert_pos == child_nodes.length - 1) {
    input_div.appendChild(span);
  } else {
    var count = 0;
    for (var i = 0; i < child_nodes.length; ++i) {
      if (child_nodes[i] != me.carret) {
        count++;
      }
      if (count == insert_pos) {
        input_div.insertBefore(span, child_nodes[i+1]);
      }
    }
  }
  return span;
}

AirConsoleKeyboard.prototype.onKey_ = function(key, element) {
  var me = this;
  element.className += " airconsole-keyboard-key-label-active";
  window.setTimeout(function () {
    element.className = element.className.replace(
        / airconsole\-keyboard\-key\-label\-active/g, "");
  }, 100);
  var span = me.addKey_(this.active_input_id, this.insert_pos, key.html);
  me.setCarret(me.spanToInsertPos_(span));
  me.onChange_();
};

AirConsoleKeyboard.prototype.onChange_ = function() {
  if (this.active_opts.onChange) {
    this.active_opts.onChange(this.active_input_id,
                              this.valueText(this.active_input_id),
                              this.valueHTML(this.active_input_id));
  }
}
