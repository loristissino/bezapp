# Notes

To compute the hash of an included javascript file, we used the command

    shasum -b -a 256 FILENAME.js | xxd -r -p | base64
    
(see [Subresource Integrity documentation](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) for more info).

# Credits

Icon: https://openclipart.org/detail/171231/dinero-money (by https://openclipart.org/user-detail/juliocesarfx).

