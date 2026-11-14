using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace LaunchsmithTunnel {
    class Program {
        private static Process tunnelProc = null;
        private static readonly object consoleLock = new object();

        [STAThread]
        static void Main(string[] args) {
            Console.Title = "Launchsmith - Cloudflare Tunnel";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("========================================================================");
            Console.WriteLine("                LAUNCHSMITH / SPACE GAME - CLOUDFLARE TUNNEL            ");
            Console.WriteLine("========================================================================");
            Console.ResetColor();

            // Locate cloudflared.exe
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string cloudflaredPath = Path.Combine(appDir, "cloudflared.exe");

            if (!File.Exists(cloudflaredPath)) {
                // Check parent or PATH
                string parentPath = Path.Combine(Directory.GetParent(appDir).FullName, "cloudflared.exe");
                if (File.Exists(parentPath)) {
                    cloudflaredPath = parentPath;
                } else {
                    cloudflaredPath = "cloudflared.exe";
                }
            }

            // Determine port
            int port = 5174;
            int customPort;
            if (args.Length > 0 && int.TryParse(args[0], out customPort)) {
                port = customPort;
            } else {
                // Auto-detect whether 5174 or 5173 is listening
                if (IsPortOpen("localhost", 5174)) {
                    port = 5174;
                } else if (IsPortOpen("localhost", 5173)) {
                    port = 5173;
                } else if (IsPortOpen("localhost", 3000)) {
                    port = 3000;
                }
            }

            Console.WriteLine("[*] Target Local Server: http://localhost:" + port);
            if (!IsPortOpen("localhost", port)) {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("[!] Note: No server currently responding on port " + port + ".");
                Console.WriteLine("    Make sure 'npm run dev' is running, or start it now.");
                Console.ResetColor();
            } else {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[✓] Local server detected on port " + port + ".");
                Console.ResetColor();
            }

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
                Console.WriteLine("    Make sure cloudflared.exe is in the application folder.");
                Console.ResetColor();
                Console.WriteLine("\nPress Enter to exit...");
                Console.ReadLine();
                return;
            }

            // Register cleanup on exit
            AppDomain.CurrentDomain.ProcessExit += (s, e) => KillTunnel();
            Console.CancelKeyPress += (s, e) => {
                KillTunnel();
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

                        // Copy to clipboard
                        try {
                            Thread clipThread = new Thread(() => {
                                try {
                                    Clipboard.SetText(publicUrl);
                                } catch {
                                    // Fallback to powershell Set-Clipboard
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

                        // Open in default browser
                        try {
                            Process.Start(publicUrl);
                            Console.WriteLine("  [✓] Opened in your default browser!");
                        } catch {}

                        Console.ForegroundColor = ConsoleColor.DarkGray;
                        Console.WriteLine("\n  Tunnel is actively streaming. Press [Q] or [Ctrl+C] to stop.\n");
                        Console.ResetColor();
                    }
                } else if (!urlFound) {
                    if (e.Data.Contains("ERR") || e.Data.Contains("error")) {
                        Console.ForegroundColor = ConsoleColor.Yellow;
                        Console.WriteLine("    " + e.Data);
                        Console.ResetColor();
                    }
                }
            };

            tunnelProc.OutputDataReceived += outputHandler;
            tunnelProc.ErrorDataReceived += outputHandler;

            tunnelProc.BeginOutputReadLine();
            tunnelProc.BeginErrorReadLine();

            // Wait for user exit command
            while (!tunnelProc.HasExited) {
                if (Console.KeyAvailable) {
                    ConsoleKeyInfo key = Console.ReadKey(true);
                    if (key.Key == ConsoleKey.Q || key.Key == ConsoleKey.Escape) {
                        break;
                    }
                }
                Thread.Sleep(200);
            }

            KillTunnel();
            Console.WriteLine("\n[*] Cloudflare tunnel stopped.");
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

        private static void KillTunnel() {
            try {
                if (tunnelProc != null && !tunnelProc.HasExited) {
                    tunnelProc.Kill();
                    tunnelProc.WaitForExit(1000);
                }
            } catch {}
        }
    }
}
