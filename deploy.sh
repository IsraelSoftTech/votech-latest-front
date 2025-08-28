
echo "Deploying files to server"

scp -r build/* root@31.97.113.198:/var/www/votech/

echo "Done!"
