
echo "Deploying files to server"

scp -r build/* root@169.58.93.96:/var/www/votech/

echo "Done!"
