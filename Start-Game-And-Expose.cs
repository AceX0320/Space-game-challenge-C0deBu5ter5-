using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace LaunchsmithFullLauncher {
    class Program {
        private static Process devServerProc = null;
        private static Process tunnelProc = null;
        private static readonly object consoleLock = new object();

        [STAThread]
        static void Main(string[] args) {
            Console.Title = "Launchsmith - Game Server & Cloudflare Tunnel";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("========================================================================");
            Console.WriteLine("          LAUNCHSMITH / SPACE GAME - COMPLETE RUNNER & TUNNEL           ");
            Console.WriteLine("========================================================================");
            Console.ResetColor();

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string cloudflaredPath = Path.Combine(appDir, "cloudflared.exe");

            if (!File.Exists(cloudflaredPath)) {
                string parentPath = Path.Combine(Directory.GetParent(appDir).FullName, "cloudflared.exe");
                if (File.Exists(parentPath)) {
                    cloudflaredPath = parentPath;
                } else {
                    cloudflaredPath = "cloudflared.exe";
                }
            }

            int detectedPort = 0;
            if (IsPortOpen("localhost", 5174)) {
                detectedPort = 5174;
            } else if (IsPortOpen("localhost", 5173)) {
                detectedPort = 5173;
            }

            if (detectedPort == 0) {
                Console.WriteLine("[*] Starting local Vite dev server (npm run dev)...");
                ProcessStartInfo serverPsi = new ProcessStartInfo();
                serverPsi.FileName = "cmd.exe";
                serverPsi.Arguments = "/c npm run dev";
                serverPsi.WorkingDirectory = appDir;
                serverPsi.UseShellExecute = false;
                serverPsi.RedirectStandardOutput = true;
                serverPsi.RedirectStandardError = true;
                serverPsi.CreateNoWindow = true;

                try {
                    devServerProc = Process.Start(serverPsi);
                    devServerProc.OutputDataReceived += (s, e) => {
                        if (!string.IsNullOrEmpty(e.Data) && (e.Data.Contains("Local:") || e.Data.Contains("517"))) {
                            Console.ForegroundColor = ConsoleColor.DarkGray;
                            Console.WriteLine("    [Vite] " + e.Data.Trim());
                            Console.ResetColor();
                        }
                    };
                    devServerProc.BeginOutputReadLine();
                    devServerProc.BeginErrorReadLine();
                } catch (Exception ex) {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("[X] Failed to launch dev server: " + ex.Message);
                    Console.ResetColor();
                }

                Console.Write("[*] Waiting for server to initialize");
                for (int i = 0; i < 25; i++) {
                    Console.Write(".");
                    Thread.Sleep(500);
                    if (IsPortOpen("localhost", 5174)) {
                        detectedPort = 5174;
                        break;
                    }
                    if (IsPortOpen("localhost", 5173)) {
                        detectedPort = 5173;
                        break;
                    }
                }
                Console.WriteLine();
            }

            int port = detectedPort > 0 ? detectedPort : 5174;
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("[✓] Game server active at http://localhost:" + port);
            Console.ResetColor();

            Console.WriteLine("[*] Starting Cloudflare Quick Tunnel via " + Path.GetFileName(cloudflaredPath) + "...");

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = cloudflaredPath;
            psi.Arguments = "tunnel --url http://localhost:" + port;
            psi.UseShellExecute = false;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.CreateNoWindow = true;

            try {
                tunnelProc = Process.Start(psi);
            } catch (Exception ex) {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[X] Failed to launch cloudflared: " + ex.Message);
                Console.ResetColor();
                Console.WriteLine("\nPress Enter to exit...");
                Console.ReadLine();
                KillAll();
                return;
            }

            AppDomain.CurrentDomain.ProcessExit += (s, e) => KillAll();
            Console.CancelKeyPress += (s, e) => {
                KillAll();
                e.Cancel = false;
            };

            bool urlFound = false;
            Regex urlRegex = new Regex(@"https://[a-zA-Z0-9-]+\.trycloudflare\.com", RegexOptions.Compiled);

            DataReceivedEventHandler outputHandler = (sender, e) => {
                if (string.IsNullOrEmpty(e.Data)) return;

                Match m = urlRegex.Match(e.Data);
                if (m.Success && !urlFound) {
                    urlFound = true;
                    string publicUrl = m.Value;

                    lock (consoleLock) {
                        Console.WriteLine();
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine("========================================================================");
                        Console.WriteLine("                  PUBLIC TUNNEL SUCCESSFULLY CREATED!                   ");
                        Console.WriteLine("========================================================================");
                        Console.ResetColor();
                        Console.Write("  [+] LOCAL URL:   ");
                        Console.ForegroundColor = ConsoleColor.White;
                        Console.WriteLine("http://localhost:" + port);
                        Console.ResetColor();
                        Console.Write("  [+] PUBLIC URL:  ");
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine(publicUrl);
                        Console.ResetColor();
                        Console.WriteLine("========================================================================");

                        try {
                            Thread clipThread = new Thread(() => {
                                try {
                                    Clipboard.SetText(publicUrl);
                                } catch {
                                    try {
                                        Process.Start(new ProcessStartInfo {
                                            FileName = "powershell",
                                            Arguments = "-NoProfile -Command \"Set-Clipboard '" + publicUrl + "'\"",
                                            CreateNoWindow = true,
                                            UseShellExecute = false
                                        });
                                    } catch {}
                                }
                            });
                            clipThread.SetApartmentState(ApartmentState.STA);
                            clipThread.Start();
                            clipThread.Join(1000);
                            Console.WriteLine("  [✓] Copied to your clipboard!");
                        } catch {}

                        try {
                            Process.Start(publicUrl);
                            Console.WriteLine("  [✓] Opened in your default browser!");
                        } catch {}

                        Console.ForegroundColor = ConsoleColor.DarkGray;
                        Console.WriteLine("\n  Game and tunnel are running. Press [Q] or [Ctrl+C] to stop.\n");
                        Console.ResetColor();
                    }
                }
            };

            tunnelProc.OutputDataReceived += outputHandler;
            tunnelProc.ErrorDataReceived += outputHandler;
            tunnelProc.BeginOutputReadLine();
            tunnelProc.BeginErrorReadLine();

            while (!tunnelProc.HasExited) {
                if (Console.KeyAvailable) {
                    ConsoleKeyInfo key = Console.ReadKey(true);
                    if (key.Key == ConsoleKey.Q || key.Key == ConsoleKey.Escape) {
                        break;
                    }
                }
                Thread.Sleep(200);
            }

            KillAll();
            Console.WriteLine("\n[*] Game server and tunnel stopped.");
        }

        private static bool IsPortOpen(string host, int port) {
            try {
                using (TcpClient client = new TcpClient()) {
                    IAsyncResult result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(400);
                    if (success) {
                        client.EndConnect(result);
                        return true;
                    }
                    return false;
                }
            } catch {
                return false;
            }
        }

        private static void KillAll() {
            try {
                if (tunnelProc != null && !tunnelProc.HasExited) {
                    tunnelProc.Kill();
                    tunnelProc.WaitForExit(1000);
                }
            } catch {}
            try {
                if (devServerProc != null && !devServerProc.HasExited) {
                    devServerProc.Kill();
                    devServerProc.WaitForExit(1000);
                }
            } catch {}
        }
    }
}
