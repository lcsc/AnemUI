#!/bin/sh

mkdir -p css
curl https://fonts.googleapis.com/css?family=Open+Sans:300,300italic,400,400italic,600,600italic%7CNoto+Serif:400,400italic,700,700italic%7CDroid+Sans+Mono:400,700 -o css/fonts.css
curl https://cdn.jsdelivr.net/gh/asciidoctor/asciidoctor@2.0/data/stylesheets/asciidoctor-default.css -o css/asciidoctor.css

for ext in excalidraw plantuml
do
    #echo testing $ext
    for fileFound in images/*.$ext
    do
        if [ -f $fileFound ]; then
            #echo found $fileFound
            filename=$(basename -- "$fileFound")
            extension="${filename##*.}"
            filename="${filename%.*}"
            echo file $filename
            curl https://kroki.io/$ext/svg/ --data-binary @$fileFound -o media/$filename.svg
            #echo ext $extension
        fi
    done
done
#curl https://kroki.io/excalidraw/svg/ --data-binary @images/logo.excalidraw -o media/logo.svg