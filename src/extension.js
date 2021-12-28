/*
 * Copyright (C) 2021 Pim Snel
 * Copyright (C) 2021 Veli Tasalı
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

const ExtensionUtils = imports.misc.extensionUtils
const Gettext = imports.gettext
const Main = imports.ui.main
const { Meta, Shell } = imports.gi

const Me = ExtensionUtils.getCurrentExtension()
const Constants = Me.imports.constants

const Domain = Gettext.domain(Me.metadata.uuid)
const ngettext = Domain.ngettext

const _shortcutsBindingIds = []

function init() {
  ExtensionUtils.initTranslations(Me.metadata.uuid)
  return new Extension()
}

class Extension {
  enable() {
    this._settings = ExtensionUtils.getSettings()

    this._bindShortcut("shortcut-align-window-to-center", this._alignWindowToCenter.bind(this))
    this._bindShortcut("shortcut-tile-window-to-center", this._tileWindowCenter.bind(this))
    this._bindShortcut("shortcut-tile-window-to-left", this._tileWindowLeft.bind(this))
    this._bindShortcut("shortcut-tile-window-to-right", this._tileWindowRight.bind(this))
    this._bindShortcut("shortcut-tile-window-to-top", this._tileWindowTop.bind(this))
    this._bindShortcut("shortcut-tile-window-to-top-left", this._tileWindowTopLeft.bind(this))
    this._bindShortcut("shortcut-tile-window-to-top-right", this._tileWindowTopRight.bind(this))
    this._bindShortcut("shortcut-tile-window-to-bottom", this._tileWindowBottom.bind(this))
    this._bindShortcut("shortcut-tile-window-to-bottom-left", this._tileWindowBottomLeft.bind(this))
    this._bindShortcut("shortcut-tile-window-to-bottom-right", this._tileWindowBottomRight.bind(this))
    this._bindShortcut("shortcut-increase-gap-size", this._increaseGapSize.bind(this))
    this._bindShortcut("shortcut-decrease-gap-size", this._decreaseGapSize.bind(this))
  }

  disable() {
    this._settings = null
    _shortcutsBindingIds.forEach((id) => Main.wm.removeKeybinding(id))
    _shortcutsBindingIds.length = 0
  }

  _alignWindowToCenter() {
    const window = global.display.get_focus_window()
    if (!window) return

    const windowArea = window.get_frame_rect()
    const monitor = window.get_monitor()
    const workspace = window.get_workspace()
    const workspaceArea = workspace.get_work_area_for_monitor(monitor)

    const x = workspaceArea.x + ((workspaceArea.width - windowArea.width) / (21 / 16))
    const y = workspaceArea.y + ((workspaceArea.height - windowArea.height) / (21 / 16))

    window.unmaximize(Meta.MaximizeFlags.BOTH)
    window.move_resize_frame(false, x, y, windowArea.width, windowArea.height)
  }

  _bindShortcut(name, callback) {
    const mode = Shell.hasOwnProperty('ActionMode') ? Shell.ActionMode : Shell.KeyBindingMode

    Main.wm.addKeybinding(
      name,
      this._settings,
      Meta.KeyBindingFlags.NONE,
      mode.ALL,
      callback
    )

    _shortcutsBindingIds.push(name)
  }

  _calculateArea(window) {
    const monitor = window.get_monitor()
    const workspace = window.get_workspace()
    const workspaceArea = workspace.get_work_area_for_monitor(monitor)
    const gap = this._gapSize

    if (gap <= 0) return {
      x: workspaceArea.x,
      y: workspaceArea.y,
      h: workspaceArea.height,
      w: workspaceArea.width,
    }

    const gaps = {
      x: Math.round(gap / 200 * workspaceArea.width),
      y: Math.round(gap / 200 * workspaceArea.height),
    }

    return {
      x: workspaceArea.x + gaps.x,
      y: workspaceArea.y + gaps.y,
      h: workspaceArea.height - (gaps.y * 2),
      w: workspaceArea.width - (gaps.x * 2),
    }
  }

  _decreaseGapSize() {
    if (this._gapSize > 0) {
      this._gapSize = Math.max(this._gapSize - Constants.GAP_SIZE_INCREMENTS, 0)
    }
    this._notifyGapSize()
  }

  _increaseGapSize() {
    if (this._gapSize < Constants.GAP_SIZE_MAX) {
      this._gapSize = Math.min(this._gapSize + Constants.GAP_SIZE_INCREMENTS, Constants.GAP_SIZE_MAX)
    }
    this._notifyGapSize()
  }

  get _gapSize() {
    return this._settings.get_int("gap-size")
  }

  set _gapSize(intValue) {
    this._settings.set_int("gap-size", intValue)
  }

  _notifyGapSize() {
    const gapSize = this._gapSize
    Main.notify(
      Me.metadata.name,
      ngettext(
        'Gap size is now at %d percent',
        'Gap size is now at %d percent',
        gapSize
      ).format(gapSize)
    )
  }

  _tileWindow(top, bottom, left, right) {
    const window = global.display.get_focus_window()
    if (!window) return

    const area = this._calculateArea(window)

    const x = left ? area.x : area.x + area.w * (16 / 21);
    const y = top ? area.y : area.y + area.h / 2;
    let w = area.w;
    if(left && right){
      w = area.w;
    }else if(left){
      w = area.w * (16 / 21);
    }else if (right) {
      w = area.w * (1 - 16 / 21);
    }
    const h = top && bottom ? area.h : area.h / 2;

    window.unmaximize(Meta.MaximizeFlags.BOTH)
    window.move_resize_frame(false, x, y, w, h)
  }

  _tileWindowBottom() {
    this._tileWindow(false, true, true, true)
  }

  _tileWindowBottomLeft() {
    this._tileWindow(false, true, true, false)
  }

  _tileWindowBottomRight() {
    this._tileWindow(false, true, false, true)
  }

  _tileWindowCenter() {
    this._tileWindow(true, true, true, true)
  }

  _tileWindowLeft() {
    this._tileWindow(true, true, true, false)
  }

  _tileWindowRight() {
    this._tileWindow(true, true, false, true)
  }

  _tileWindowTop() {
    this._tileWindow(true, false, true, true)
  }

  _tileWindowTopLeft() {
    this._tileWindow(true, false, true, false)
  }

  _tileWindowTopRight() {
    this._tileWindow(true, false, false, true)
  }
}
