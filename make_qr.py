"""Create a QR image once the public Zad page responds successfully."""

import argparse
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="Verified public HTTPS URL of the Zad homepage")
    parser.add_argument("--output", type=Path, default=Path("zad-qr.png"))
    args = parser.parse_args()

    url = urlsplit(args.url)
    if url.scheme != "https" or not url.hostname or url.username or url.password:
        parser.error("Use the public HTTPS address without credentials.")
    try:
        with urlopen(args.url, timeout=15) as response:
            if urlsplit(response.url).scheme != "https":
                parser.error("The public address redirected away from HTTPS.")
            if "زاد | منصة التوعية الدينية".encode() not in response.read(200_000):
                parser.error("The address did not return the Zad homepage.")
            destination = response.url
    except OSError as error:
        parser.error(f"The site could not be reached: {error}")

    import qrcode

    qrcode.make(destination).save(args.output)
    print(args.output)


if __name__ == "__main__":
    main()
