import icons from "@/utils/icons";
import { bind, exec, Variable } from "astal";
import { App, Astal, Gdk, Gtk } from "astal/gtk3";
import Mpris from "gi://AstalMpris";
import Battery from "gi://AstalBattery";
import Wp from "gi://AstalWp";
import Network from "gi://AstalNetwork";
import Tray from "gi://AstalTray";

const WINDOW_NAME = "bar";

const time = Variable("").poll(1000, "date '+%a %d %b | %I:%M %p'");

function SysTray() {
  const tray = Tray.get_default();

  return (
    <box>
      {bind(tray, "items").as((items) =>
        items.map((item) => {
          if (item.iconThemePath) App.add_icons(item.iconThemePath);

          const menu = item.create_menu();

          return (
            <button
              className="BarBtn"
              tooltipMarkup={bind(item, "tooltipMarkup")}
              onDestroy={() => menu?.destroy()}
              onClickRelease={(self) => {
                menu?.popup_at_widget(
                  self,
                  Gdk.Gravity.SOUTH,
                  Gdk.Gravity.NORTH,
                  null,
                );
              }}
            >
              <icon gIcon={bind(item, "gicon")} />
            </button>
          );
        }),
      )}
    </box>
  );
}

function Wifi() {
  const { wifi } = Network.get_default();

  return (
    <icon
      tooltipText={bind(wifi, "ssid").as(String)}
      className="Wifi"
      icon={bind(wifi, "iconName")}
    />
  );
}

function AudioLevel() {
  const speaker = Wp.get_default()?.audio.defaultSpeaker!;

  return <icon icon={bind(speaker, "volumeIcon")} />;
}

function secondsToHoursMinutes(time) {
  time = time.get(); // TODO: Make reactive
  time = Math.round(time / 60);
  return `${Math.floor(time / 60)}h ${Math.floor(time % 60)}m remaining`;
}

function BatteryLevel() {
  const bat = Battery.get_default();

  return (
    <box
      className="Battery"
      visible={bind(bat, "isPresent")}
      tooltipText={secondsToHoursMinutes(bind(bat, "timeToEmpty"))}
    >
      <icon className="IconLabel" icon={bind(bat, "batteryIconName")} />
      <label
        css="font-size: 13px;"
        label={bind(bat, "percentage").as((p) => {
          let level = Math.floor(p * 100);
          return level === 100 ? "Full" : `${level}%`;
        })}
      />
    </box>
  );
}

function Media() {
  const spotify = Mpris.Player.new("spotify");

  const formattedLabel = Variable.derive(
    [bind(spotify, "artist"), bind(spotify, "title")],
    (artist: String, title: String) => artist + " - " + title,
  );

  return (
    <>
      {bind(spotify, "available").as((available) =>
        available ? (
          <>
            <icon
              className="IconLabel"
              icon={bind(spotify, "playbackStatus").as((status) =>
                status === Mpris.PlaybackStatus.PLAYING
                  ? icons.media.playing
                  : icons.media.stopped,
              )}
            />
            <button className="BarBtn" onClick={() => spotify.play_pause()}>
              <label label={formattedLabel()} />
            </button>
          </>
        ) : (
          "Nothing Playing"
        ),
      )}
    </>
  );
}

function Stats() {
  const cpu = Variable(0).poll(5000, [
    "sh",
    "-c",
    "top -bn1 | grep Cpu | sed 's/\\,/\\./g' | awk '{print $2}'",
  ]);
  const memory = Variable(0).poll(5000, [
    "sh",
    "-c",
    `free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`,
  ]);
  const gpu = Variable(0).poll(
    5000,
    "cat /sys/class/hwmon/hwmon6/device/gpu_busy_percent",
  );
  const temp = Variable(0).poll(
    5000,
    "cat /sys/class/thermal/thermal_zone0/temp",
  );

  return (
    <box css="padding: 12px 0; margin-right: 20px;" spacing={10}>
      <circularprogress
        value={cpu((val) => val / 100)}
        startAt={0.75}
        endAt={0.75}
        tooltipText={cpu((val) => `${val}% used`)}
        className="Stats"
        rounded
      />
      <circularprogress
        value={memory((val) => val / 100)}
        startAt={0.75}
        endAt={0.75}
        tooltipText={memory((val) => `${val}% used`)}
        className="Stats"
        rounded
      />
      <circularprogress
        value={gpu((val) => val / 100)}
        startAt={0.75}
        endAt={0.75}
        tooltipText={gpu((val) => `${val}%`)}
        className="Stats"
        rounded
      />
      <circularprogress
        value={temp((val) => val / 1000 / 100)}
        startAt={0.75}
        endAt={0.75}
        className="Stats"
        rounded
        tooltipText={temp((val) => `${val / 1000}°C`)}
      />
    </box>
  );
}

export default function Bar(monitor: number) {
  return (
    <window
      name={WINDOW_NAME}
      monitor={monitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={
        Astal.WindowAnchor.TOP |
        Astal.WindowAnchor.LEFT |
        Astal.WindowAnchor.RIGHT
      }
      application={App}
    >
      <box vertical>
        {/* <box className="Workspaces"></box> */}
        <centerbox className="Bar">
          {/* Left */}
          <box>
            <Stats />
            <Media />
          </box>

          {/* Center */}
          <button
            className="BarBtn"
            // onClick={() => exec("gnome-calendar")}
            onClick={() => App.toggle_window("dashboard")}
            halign={Gtk.Align.END}
          >
            <label label={time()} />
          </button>

          {/* Right */}
          <box halign={Gtk.Align.END} spacing={20}>
            <SysTray />
            <Wifi />
            <AudioLevel />
            <BatteryLevel />
          </box>
        </centerbox>
      </box>
    </window>
  );
}
